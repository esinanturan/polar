import uuid

from polar.exceptions import PolarTaskError
from polar.worker import AsyncSessionMaker, CronTrigger, JobContext, task

from .repository import CheckoutRepository
from .service import checkout as checkout_service


class CheckoutTaskError(PolarTaskError): ...


@task("checkout.handle_free_success")
async def handle_free_success(ctx: JobContext, checkout_id: uuid.UUID) -> None:
    async with AsyncSessionMaker(ctx) as session:
        await checkout_service.handle_free_success(session, checkout_id)


@task(
    "checkout.expire_open_checkouts",
    cron_trigger=CronTrigger.from_crontab("0,15,30,45 * * * *"),
)
async def expire_open_checkouts(ctx: JobContext) -> None:
    async with AsyncSessionMaker(ctx) as session:
        repository = CheckoutRepository.from_session(session)
        await repository.expire_open_checkouts()
