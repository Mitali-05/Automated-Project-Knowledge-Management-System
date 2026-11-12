import os
import asyncio
import logging
from typing import List
from dotenv import load_dotenv
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

# Configure standard industrial logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

class GitHubMCPClientService:
    """
    A service class for interacting with the GitHub MCP Server.
    Designed for modularity, dependency injection, and microservices architecture.
    """
    
    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("GitHub access token is required for initialization.")
        self.access_token = access_token
        self.server_params = self._configure_server()

    def _configure_server(self) -> StdioServerParameters:
        """Configures the subprocess environment for the MCP server."""
        env = os.environ.copy()
        env["GITHUB_PERSONAL_ACCESS_TOKEN"] = self.access_token
        
        return StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-github"],
            env=env
        )

    async def list_available_tools(self) -> List[str]:
        """Connects to the MCP server and retrieves the list of available tools."""
        logger.info("Initializing connection to GitHub MCP Server...")
        try:
            async with stdio_client(self.server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    logger.info("Successfully connected to the GitHub MCP Server.")
                    
                    tools_response = await session.list_tools()
                    tool_names = [tool.name for tool in tools_response.tools]
                    logger.info(f"Retrieved {len(tool_names)} tools from the server.")
                    return tool_names
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {e}", exc_info=True)
            raise

async def execute_test():
    load_dotenv()
    token = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")
    
    if not token:
        logger.error("Environment variable 'GITHUB_PERSONAL_ACCESS_TOKEN' is not set.")
        return

    client_service = GitHubMCPClientService(access_token=token)
    try:
        tools = await client_service.list_available_tools()
        logger.info(f"Available Tools: {tools}")
    except Exception:
        logger.error("Test execution aborted due to connection failure.")

if __name__ == "__main__":
    asyncio.run(execute_test())
