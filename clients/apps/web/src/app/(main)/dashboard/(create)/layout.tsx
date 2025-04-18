export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="relative flex min-h-screen w-full max-w-md flex-col items-center md:py-0">
        {children}
      </div>
    </div>
  )
}
