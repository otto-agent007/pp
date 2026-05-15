// Ambient declarations for @modelcontextprotocol/sdk sub-path imports.
// The installed package ships without .d.ts files in this environment;
// these stubs give TypeScript enough shape to compile while skipLibCheck
// suppresses errors in the SDK's own internals.

declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  export class McpServer {
    constructor(options: { name: string; version: string });
    registerTool(name: string, config: object, handler: (...args: any[]) => any): void;
    connect(transport: any): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {
    constructor();
  }
}

declare module "@modelcontextprotocol/sdk/server/mcp" {
  export class McpServer {
    constructor(options: { name: string; version: string });
    registerTool(name: string, config: object, handler: (...args: any[]) => any): void;
    connect(transport: any): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio" {
  export class StdioServerTransport {
    constructor();
  }
}

declare module "@modelcontextprotocol/sdk/server" {
  export class McpServer {
    constructor(options: { name: string; version: string });
    registerTool(name: string, config: object, handler: (...args: any[]) => any): void;
    connect(transport: any): Promise<void>;
  }
  export class StdioServerTransport {
    constructor();
  }
}
