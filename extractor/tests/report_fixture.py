"""Synthetic export fixture; never used as application data."""
from app.core.models import AgentExtractionResult


def report_fixture():
    return AgentExtractionResult.model_validate({
        'project_name': 'PRISM export QA & <formatting>',
        'problem_statement': 'A synthetic fixture for typography, pagination and diagram tests. This is not a repository audit.',
        'tech_stack': ['Python (test fixture)'],
        'architecture_mermaid_chart': 'flowchart LR\n A["API"] --> Q["Queue"]\n Q --> W["Worker"]\n W --> D["Database"]',
        'milestone_timeline_mermaid_chart': '',
        'analytics_metrics': {'estimated_complexity': 'Unknown', 'core_module_count': 1,
                              'key_patterns_used': [], 'data_flow_complexity': 'Unknown',
                              'security_posture': 'Not evaluated by this fixture'},
        'presentation_deck': {'executive_pitch': 'Test export structure.', 'business_value': 'Not measured.',
                              'technical_challenges': 'Preserve readable diagrams and complete text.',
                              'future_scope': 'Proposed: validate exports locally.', 'roi_summary': ''},
        'developer_handover_guide': {
            'local_setup_prerequisites': 'Run the export smoke test; this fixture makes no database writes.',
            'critical_workflows': [{'workflow_name': 'Synthetic processing example',
                                   'entry_point': 'app/main.py (fixture)',
                                   'execution_path': 'A controlled interaction for renderer tests; not a production workflow.'}],
            'execution_sequence_chart': 'sequenceDiagram\n autonumber\n participant A as API\n participant Q as Queue\n participant W as Worker\n participant D as Database\n A->>Q: Publish identifier\n Q->>W: Deliver event\n W->>D: Read record\n D-->>W: Record\n W->>D: Save result\n D-->>W: Commit result',
            'directory_tour': [{'folder_path': 'app/main.py', 'architectural_role': 'Fixture entry point'}],
            'technical_debt_and_fragility': ['This fixture does not establish production readiness.'],
        },
        'knowledge_items': [{'title': 'Literal markup & paths', 'knowledge_type': 'CONFIGURATION',
                             'summary': 'Render <literal> text without treating it as XML.',
                             'details': 'Keep complete text and source paths.', 'module': 'app/main.py',
                             'confidence': .5, 'evidence_ids': ['app/main.py']}],
        'inspected_files': ['app/main.py'],
    })
