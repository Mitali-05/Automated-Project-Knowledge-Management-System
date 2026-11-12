import os
import logging
from typing import List
from contextlib import asynccontextmanager

from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

logger = logging.getLogger(__name__)

import sys
import shutil

class GitHubMCPClientService:
    """
    A modular service class for managing the lifecycle of the GitHub MCP Server process.
    """
    
    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("GitHub access token is required for initialization.")
        self.access_token = access_token
        self.server_params = self._configure_server()

    def _configure_server(self) -> StdioServerParameters:
        """Configures the subprocess environment for the MCP server."""
        
        # 1. Foolproof Command Resolution (Windows vs Linux/Mac)
        command = "npx.cmd" if sys.platform == "win32" else "npx"
        
        # 2. Foolproof Dependency Check
        if not shutil.which(command):
            raise FileNotFoundError(
                f"Could not find '{command}' in your system PATH. "
                "Node.js and npm must be installed to run the GitHub MCP Server."
            )
            
        env = os.environ.copy()
        env["GITHUB_PERSONAL_ACCESS_TOKEN"] = self.access_token
        
        return StdioServerParameters(
            command=command,
            args=["-y", "@modelcontextprotocol/server-github"],
            env=env
        )

    @asynccontextmanager
    async def connect(self):
        """
        Provides an active MCP ClientSession that automatically cleans up.
        Usage:
            async with service.connect() as session:
                await session.call_tool(...)
        """
        logger.info("Initializing connection to GitHub MCP Server subprocess...")
        try:
            async with stdio_client(self.server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    logger.info("Successfully connected to the GitHub MCP Server.")
                    yield session
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {e}", exc_info=True)
            raise
