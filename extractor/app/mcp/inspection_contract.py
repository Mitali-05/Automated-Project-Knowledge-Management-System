"""Checks that an architecture report is based on files actually inspected."""
import re
from pathlib import PurePosixPath

CODE_SUFFIXES = {'.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.go', '.rs', '.cs', '.rb', '.php', '.c', '.cpp'}
MANIFESTS = {'package.json', 'pom.xml', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml'}


class DiagramContractError(ValueError):
    """A model-generated diagram needs revision before publication."""
    path = ('developer_handover_guide', 'execution_sequence_chart')


class UninspectedEvidenceError(ValueError):
    """The exploration loop must read these files before accepting the report."""
    def __init__(self, paths, report):
        self.paths = sorted(set(paths))
        self.report_json = report.model_dump_json()
        super().__init__('Evidence cites files not inspected: ' + ', '.join(self.paths))


def inspection_deficits(file_tree, inspected):
    paths = {item['path'] for item in (file_tree or []) if item.get('path') and item.get('type') != 'tree'}
    code = sorted(p for p in paths if PurePosixPath(p).suffix in CODE_SUFFIXES
                  and not any(part in {'node_modules', 'vendor', '.venv', 'tests', 'test', '__tests__'}
                              for part in PurePosixPath(p).parts))
    required = min(3, len(code))
    deficits = []
    if len(set(code) & inspected) < required:
        deficits.append(f'Read {required} distinct runtime source files before finalizing. '
                        f'Available unread files: {", ".join(p for p in code if p not in inspected)[:2000]}')
    manifests = sorted(p for p in paths if PurePosixPath(p).name in MANIFESTS)
    if manifests and not (set(manifests) & inspected):
        deficits.append('Read a dependency manifest: ' + ', '.join(manifests[:10]))
    return deficits


def validate_sequence_diagram(sequence):
    sequence = sequence or ''
    if not re.search(r'^\s*sequenceDiagram\s*$', sequence, re.MULTILINE):
        raise DiagramContractError('A dedicated Mermaid sequenceDiagram is required')
    if not re.search(r'^\s*autonumber\b', sequence, re.MULTILINE):
        raise DiagramContractError('The sequence diagram must include autonumber')
    participants = set(re.findall(r'^\s*(?:participant|actor)\s+(\w+)', sequence, re.MULTILINE))
    for sender, receiver in re.findall(r'^\s*(\w+)\s*--?>>\s*[+-]?(\w+)\s*:', sequence, re.MULTILINE):
        participants.update((sender, receiver))
    if len(participants) > 4:
        raise DiagramContractError(f'Sequence diagram exceeds the four-participant readability budget: {len(participants)} participants ({", ".join(sorted(participants))})')
    if len(re.findall(r'->>', sequence)) > 12:
        raise DiagramContractError('Sequence diagram exceeds the twelve-message readability budget')


def validate_report_contract(result, inspected):
    cited_items = [*result.knowledge_items, *result.technical_diagrams]
    unread = sorted({p for item in cited_items for p in item.evidence_ids if p not in inspected})
    if unread:
        raise UninspectedEvidenceError(unread, result)
    if result.milestone_timeline_mermaid_chart.strip():
        error = DiagramContractError('Set milestone_timeline_mermaid_chart to an empty string. Verified project history is unavailable.')
        error.path = ('milestone_timeline_mermaid_chart',)
        raise error
    validate_sequence_diagram(result.developer_handover_guide.execution_sequence_chart)
    for index, diagram in enumerate(result.technical_diagrams):
        try:
            if diagram.kind == 'sequence':
                validate_sequence_diagram(diagram.mermaid)
            elif not re.search(r'^\s*flowchart\s+(?:LR|TD|TB)\b', diagram.mermaid):
                raise DiagramContractError('A technical flowchart must start with flowchart LR, TD or TB')
        except DiagramContractError as exc:
            exc.path = ('technical_diagrams', index, 'mermaid')
            raise
    result.inspected_files = sorted(inspected)


def prioritized_tree_paths(file_tree, limit=200):
    """Deterministic navigation hints, not an automatic claim about file importance."""
    def rank(path):
        parts = PurePosixPath(path).parts
        name = PurePosixPath(path).name.lower()
        if any(p in {'node_modules', '.git', '.venv', 'vendor', 'dist', 'build', '__pycache__'} for p in parts):
            return 9
        if name in {'readme.md', 'docker-compose.yml', 'compose.yaml'} or PurePosixPath(path).name in MANIFESTS:
            return 0
        if name in {'main.py', 'app.py', 'main.ts', 'app.tsx', 'application.yml'} or any(s in name for s in ('controller', 'router', 'consumer', 'producer', 'models', 'migration', 'service')):
            return 1
        if PurePosixPath(path).suffix in CODE_SUFFIXES:
            return 2
        return 3
    paths = {item['path'] for item in (file_tree or []) if item.get('path') and item.get('type') != 'tree'}
    return sorted(paths, key=lambda p: (rank(p), p))[:limit]
