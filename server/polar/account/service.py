from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

import stripe as stripe_lib
from sqlalchemy import Select, and_, select
from sqlalchemy.orm import joinedload

from polar.campaign.service import campaign as campaign_service
from polar.enums import AccountType
from polar.exceptions import PolarError
from polar.integrations.loops.service import loops as loops_service
from polar.integrations.open_collective.service import (
    CollectiveNotFoundError,
    OpenCollectiveAPIError,
    open_collective,
)
from polar.integrations.stripe.service import stripe
from polar.kit.pagination import PaginationParams, paginate
from polar.kit.services import ResourceService
from polar.models import Account, Organization, User
from polar.models.transaction import TransactionType
from polar.postgres import AsyncSession
from polar.transaction.service.transaction import transaction as transaction_service
from polar.worker import enqueue_job

from .schemas import AccountCreate, AccountLink, AccountUpdate


class AccountServiceError(PolarError):
    pass


class AccountAlreadyExistsError(AccountServiceError):
    def __init__(self) -> None:
        super().__init__("An account already exists for this organization.")


class AccountExternalIdDoesNotExist(AccountServiceError):
    def __init__(self, external_id: str) -> None:
        self.external_id = external_id
        message = f"No associated account exists with external ID {external_id}"
        super().__init__(message)


class AccountService(ResourceService[Account, AccountCreate, AccountUpdate]):
    async def search(
        self, session: AsyncSession, user: User, *, pagination: PaginationParams
    ) -> tuple[Sequence[Account], int]:
        statement = self._get_readable_accounts_statement(user)

        results, count = await paginate(session, statement, pagination=pagination)

        return results, count

    async def get_by_user_id(
        self, session: AsyncSession, user_id: UUID
    ) -> Account | None:
        statement = select(Account).join(
            User,
            onclause=and_(
                User.account_id == Account.id,
                User.id == user_id,
            ),
        )
        result = await session.execute(statement)
        return result.unique().scalar_one_or_none()

    async def get_by_organization_id(
        self, session: AsyncSession, organization_id: UUID
    ) -> Account | None:
        statement = select(Account).join(
            Organization,
            onclause=and_(
                Organization.account_id == Account.id,
                Organization.id == organization_id,
            ),
        )
        result = await session.execute(statement)
        return result.unique().scalar_one_or_none()

    async def get_by_id(self, session: AsyncSession, id: UUID) -> Account | None:
        statement = (
            select(Account)
            .where(Account.id == id)
            .options(joinedload(Account.users), joinedload(Account.organizations))
        )
        result = await session.execute(statement)
        return result.unique().scalar_one_or_none()

    async def get_by_stripe_id(
        self, session: AsyncSession, stripe_id: str
    ) -> Account | None:
        return await self.get_by(session=session, stripe_id=stripe_id)

    async def create_account(
        self,
        session: AsyncSession,
        *,
        admin: User,
        account_create: AccountCreate,
    ) -> Account:
        if account_create.account_type == AccountType.stripe:
            account = await self._create_stripe_account(session, admin, account_create)
        elif account_create.account_type == AccountType.open_collective:
            account = await self._create_open_collective_account(
                session, admin.id, account_create
            )
        else:
            raise AccountServiceError("Unknown account type")

        await loops_service.user_created_account(
            session, admin, accountType=account.account_type
        )

        return account

    async def check_review_threshold(
        self, session: AsyncSession, account: Account
    ) -> Account:
        if account.is_under_review():
            return account

        transfers_sum = await transaction_service.get_transactions_sum(
            session, account.id, type=TransactionType.balance
        )
        if (
            account.next_review_threshold is not None
            and transfers_sum >= account.next_review_threshold
        ):
            account.status = Account.Status.UNDER_REVIEW
            session.add(account)

            enqueue_job("account.under_review", account_id=account.id)

        return account

    async def confirm_account_reviewed(
        self, session: AsyncSession, account: Account, next_review_threshold: int
    ) -> Account:
        account.status = Account.Status.ACTIVE
        account.next_review_threshold = next_review_threshold
        session.add(account)
        enqueue_job("account.reviewed", account_id=account.id)
        return account

    async def _build_stripe_account_name(
        self, session: AsyncSession, account: Account
    ) -> str | None:
        # The account name is visible for users and is used to differentiate accounts
        # from the same Platform ("Polar") in Stripe Express.
        await session.refresh(account, {"users", "organizations"})
        associations = []
        for user in account.users:
            associations.append(f"user/{user.email}")
        for organization in account.organizations:
            associations.append(f"org/{organization.slug}")
        return "·".join(associations)

    async def _create_stripe_account(
        self, session: AsyncSession, admin: User, account_create: AccountCreate
    ) -> Account:
        try:
            stripe_account = await stripe.create_account(
                account_create, name=None
            )  # TODO: name
        except stripe_lib.StripeError as e:
            if e.user_message:
                raise AccountServiceError(e.user_message) from e
            else:
                raise AccountServiceError("An unexpected Stripe error happened") from e

        account = Account(
            status=Account.Status.ONBOARDING_STARTED,
            admin_id=admin.id,
            account_type=account_create.account_type,
            stripe_id=stripe_account.id,
            email=stripe_account.email,
            country=stripe_account.country,
            currency=stripe_account.default_currency,
            is_details_submitted=stripe_account.details_submitted,
            is_charges_enabled=stripe_account.charges_enabled,
            is_payouts_enabled=stripe_account.payouts_enabled,
            business_type=stripe_account.business_type,
            data=stripe_account.to_dict(),
            users=[],
            organizations=[],
        )

        campaign = await campaign_service.get_eligible(session, admin)
        if campaign:
            account.campaign_id = campaign.id
            account._platform_fee_percent = campaign.fee_percent
            account._platform_fee_fixed = campaign.fee_fixed

        session.add(account)
        return account

    async def _create_open_collective_account(
        self, session: AsyncSession, admin_id: UUID, account_create: AccountCreate
    ) -> Account:
        assert account_create.open_collective_slug is not None
        try:
            collective = await open_collective.get_collective(
                account_create.open_collective_slug
            )
        except OpenCollectiveAPIError as e:
            raise AccountServiceError(e.message, e.status_code) from e
        except CollectiveNotFoundError as e:
            raise AccountServiceError(e.message, e.status_code) from e

        if not collective.is_eligible:
            raise AccountServiceError(
                "This collective is not eligible to receive payouts. "
                "You can use Stripe instead.",
                400,
            )

        account = Account(
            status=Account.Status.ACTIVE,
            admin_id=admin_id,
            account_type=account_create.account_type,
            open_collective_slug=account_create.open_collective_slug,
            email=None,
            country=account_create.country,
            users=[],
            organizations=[],
            # For now, hard-code those values
            currency="usd",
            is_details_submitted=True,
            is_charges_enabled=True,
            is_payouts_enabled=True,
            business_type="fiscal_host",
            data={},
        )
        session.add(account)
        return account

    async def update_account_from_stripe(
        self, session: AsyncSession, *, stripe_account: stripe_lib.Account
    ) -> Account:
        account = await self.get_by_stripe_id(session, stripe_account.id)
        if account is None:
            raise AccountExternalIdDoesNotExist(stripe_account.id)

        account.email = stripe_account.email
        account.currency = stripe_account.default_currency
        account.is_details_submitted = stripe_account.details_submitted or False
        account.is_charges_enabled = stripe_account.charges_enabled or False
        account.is_payouts_enabled = stripe_account.payouts_enabled or False
        if stripe_account.country is not None:
            account.country = stripe_account.country
        account.data = stripe_account.to_dict()

        if all(
            (
                not account.is_active(),
                not account.is_under_review(),
                account.currency is not None,
                account.is_details_submitted,
                account.is_charges_enabled,
                account.is_payouts_enabled,
            )
        ):
            account.status = Account.Status.ACTIVE

        # If Stripe disables some capabilities, reset to ONBOARDING_STARTED
        if any(
            (
                not account.is_details_submitted,
                not account.is_charges_enabled,
                not account.is_payouts_enabled,
            )
        ):
            account.status = Account.Status.ONBOARDING_STARTED

        session.add(account)

        return account

    async def onboarding_link(
        self, account: Account, return_path: str
    ) -> AccountLink | None:
        if account.account_type == AccountType.stripe:
            assert account.stripe_id is not None
            account_link = await stripe.create_account_link(
                account.stripe_id, return_path
            )
            return AccountLink(url=account_link.url)

        return None

    async def dashboard_link(self, account: Account) -> AccountLink | None:
        if account.account_type == AccountType.stripe:
            assert account.stripe_id is not None
            account_link = await stripe.create_login_link(account.stripe_id)
            return AccountLink(url=account_link.url)

        elif account.account_type == AccountType.open_collective:
            assert account.open_collective_slug is not None
            dashboard_link = open_collective.create_dashboard_link(
                account.open_collective_slug
            )
            return AccountLink(url=dashboard_link)

        return None

    async def sync_to_upstream(self, session: AsyncSession, account: Account) -> None:
        name = await self._build_stripe_account_name(session, account)

        if account.account_type == AccountType.stripe and account.stripe_id:
            await stripe.update_account(account.stripe_id, name)

    def _get_readable_accounts_statement(self, user: User) -> Select[tuple[Account]]:
        statement = (
            select(Account).options(
                joinedload(Account.organizations), joinedload(Account.users)
            )
        ).where(Account.admin_id == user.id, Account.deleted_at.is_(None))

        return statement


account = AccountService(Account)
