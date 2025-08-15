import Link from 'next/link';

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">MCP Testing</h1>
          <div className="space-x-4">
            <Link href="/" className="hover:text-gray-300">
              Home
            </Link>
            <Link href="/test-mcp-server-tool" className="hover:text-gray-300">
              MCP Server Tool Tester
            </Link>
          </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  );
}
