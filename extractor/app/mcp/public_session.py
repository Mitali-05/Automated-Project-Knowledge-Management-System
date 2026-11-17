"""Read-only agent tools for explicitly selected, unauthenticated public access."""
import asyncio
import base64
import json
from urllib.parse import quote

import requests
from mcp.types import CallToolResult, ListToolsResult, TextContent, Tool


class PublicRepositorySession:
    def __init__(self, owner: str, repo: str):
        self.owner, self.repo = owner, repo
        self.base = f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"

    def _get(self, path='', params=None):
        response = requests.get(self.base + path, params=params,
                                headers={'Accept': 'application/vnd.github+json',
                                         'X-GitHub-Api-Version': '2022-11-28'}, timeout=30)
        response.raise_for_status()
        return response.json()

    def verify_public(self):
        try:
            metadata = self._get()
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 404:
                raise RuntimeError(
                    'GitHub returned 404 for unauthenticated repository access. The repository may be private, '
                    'renamed, missing, or the URL may be incorrect. For a private repository, connect the PRISM '
                    'GitHub App in this project\'s workspace, grant this repository access, then retry sync.'
                ) from exc
            raise
        if metadata.get('private') is not False:
            raise RuntimeError('Repository is not confirmed public. Connect GitHub for private access.')

    async def list_tools(self):
        return ListToolsResult(tools=[Tool(
            name='get_file_contents', description='Read a file or list a directory in this public repository.',
            input_schema={'type': 'object', 'properties': {
                'owner': {'type': 'string'}, 'repo': {'type': 'string'},
                'path': {'type': 'string'}, 'branch': {'type': 'string'}},
                'required': ['path'], 'additionalProperties': False})])

    async def call_tool(self, name, arguments):
        if name != 'get_file_contents':
            raise ValueError('Only get_file_contents is permitted in public mode')
        if arguments.get('owner', self.owner) != self.owner or arguments.get('repo', self.repo) != self.repo:
            raise ValueError('Tool request is outside the selected repository')
        path = arguments['path'].lstrip('/')
        if '..' in path.split('/'):
            raise ValueError('Parent path segments are not allowed')
        # Recheck visibility so a visibility change cannot silently change access mode.
        await asyncio.to_thread(self.verify_public)
        params = {'ref': arguments['branch']} if arguments.get('branch') else None
        data = await asyncio.to_thread(self._get, '/contents/' + quote(path, safe='/'), params)
        if isinstance(data, dict) and data.get('type') == 'file':
            from app.core.config import MAX_FILE_BYTES
            if data.get('size', 0) > MAX_FILE_BYTES:
                raise ValueError('File exceeds configured MAX_FILE_BYTES')
            if data.get('encoding') != 'base64':
                raise ValueError('GitHub did not return supported file content')
            data['content'] = base64.b64decode(data['content'], validate=False).decode('utf-8')
            data['encoding'] = 'utf-8'
        return CallToolResult(content=[TextContent(type='text', text=json.dumps(data))])
