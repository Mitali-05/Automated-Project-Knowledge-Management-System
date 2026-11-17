"""Verification output recovery tests. No provider, repository or database access."""
import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.core.llm_client import LLMClient, LLMError, LLMOutputError, parse_json_object
from app.core.verification_agent import VerificationAgent, VERIFICATION_SYSTEM_PROMPT
from report_fixture import report_fixture


def audit_fixture(verdict='VERIFIED_WITH_WARNINGS'):
    return {
        'overall_trust_score': 50.0, 'verdict': verdict,
        'evidence_precision_score': 50.0, 'subsystem_recall_coverage': 20.0,
        'hallucination_rate': 10.0,
        'ml_audit': {'ml_models_detected': False, 'detected_frameworks': [],
                     'notes': 'Synthetic audit fixture; no runtime validation.'},
        'verified_claims_count': 0, 'unsupported_claims_count': 1,
        'audit_findings': ['File existence is not proof of behaviour.'],
        'verification_agent_notes': 'No independent source-body or runtime audit.',
    }


class VerificationOutputTests(unittest.TestCase):
    def setUp(self):
        self.client = Mock(model='configured-auditor', provider='gemini')
        self.agent = VerificationAgent(self.client)
        self.sleep = patch('app.core.verification_agent.time.sleep').start()
        self.addCleanup(patch.stopall)

    def test_real_parser_rejects_unquoted_comment_without_echoing_payload(self):
        raw = '{"ml_audit": { _comment: "private source content"}}'
        with self.assertRaises(LLMOutputError) as context:
            parse_json_object(raw, 'gemini')
        self.assertEqual(context.exception.raw_response, raw)
        self.assertNotIn('private source content', str(context.exception))

    def test_syntax_error_is_corrected_with_original_context_same_client(self):
        raw = '{"verdict":"VERIFIED_WITH_WARNINGS", _comment:"not JSON"}'
        self.client.extract_json.side_effect = [LLMOutputError('Invalid JSON at line 1', raw), audit_fixture()]
        report = self.agent.audit_extraction(report_fixture())
        self.assertEqual(report.verdict, 'VERIFIED_WITH_WARNINGS')
        self.assertEqual(self.client.extract_json.call_count, 2)
        first = self.client.extract_json.call_args_list[0].kwargs
        second = self.client.extract_json.call_args_list[1].kwargs
        self.assertIn(first['user_content'], second['user_content'])
        self.assertIn(raw, second['user_content'])
        self.assertEqual(first['system_prompt'], second['system_prompt'])
        self.sleep.assert_called_once_with(15)

    def test_unknown_fields_trigger_correction_instead_of_silent_drop(self):
        invalid = audit_fixture()
        invalid['ml_audit']['_comment'] = 'Preserve this uncertainty in notes.'
        self.client.extract_json.side_effect = [invalid, audit_fixture()]
        report = self.agent._validated_audit('original evidence', '')
        self.assertEqual(report.unsupported_claims_count, 1)
        prompt = self.client.extract_json.call_args.kwargs['user_content']
        self.assertIn('extra_forbidden', prompt)
        self.assertIn('Preserve this uncertainty', prompt)

    def test_schema_error_is_corrected_not_coerced(self):
        invalid = audit_fixture()
        invalid['overall_trust_score'] = '50'
        self.client.extract_json.side_effect = [invalid, audit_fixture()]
        self.agent._validated_audit('evidence', '')
        self.assertEqual(self.client.extract_json.call_count, 2)
        self.assertIn('float_type', self.client.extract_json.call_args.kwargs['user_content'])

    def test_repeated_invalid_output_fails_with_specific_reason(self):
        self.client.extract_json.side_effect = LLMOutputError('Invalid JSON at line 9 column 5', '{bad}')
        with self.assertRaisesRegex(LLMError, 'after 2 correction attempts.*line 9 column 5'):
            self.agent.audit_extraction(report_fixture())
        self.assertEqual(self.client.extract_json.call_count, 3)
        self.assertEqual(self.sleep.call_count, 2)

    def test_provider_failure_is_not_retried_as_formatting(self):
        self.client.extract_json.side_effect = LLMError('gemini provider unavailable (503)')
        with self.assertRaisesRegex(LLMError, 'Verification audit failed.*503'):
            self.agent.audit_extraction(report_fixture())
        self.client.extract_json.assert_called_once()
        self.sleep.assert_not_called()

    def test_rejected_audit_is_never_retried_into_passing(self):
        self.client.extract_json.return_value = audit_fixture('REJECTED')
        report = self.agent.audit_extraction(report_fixture())
        self.assertEqual(report.verdict, 'REJECTED')
        self.client.extract_json.assert_called_once()
        self.sleep.assert_not_called()

    def test_formatting_correction_cannot_change_a_known_rejected_verdict(self):
        invalid = audit_fixture('REJECTED')
        invalid['overall_trust_score'] = '50'
        self.client.extract_json.side_effect = [invalid, audit_fixture('VERIFIED_WITH_WARNINGS')]
        with self.assertRaisesRegex(LLMError, 'correction changed the previous audit verdict'):
            self.agent._validated_audit('evidence', '')
        self.assertEqual(self.client.extract_json.call_count, 2)

    def test_production_certification_still_fails_without_correction(self):
        self.client.extract_json.return_value = audit_fixture('VERIFIED_PRODUCTION_GRADE')
        with self.assertRaisesRegex(LLMError, 'cannot certify production readiness'):
            self.agent.audit_extraction(report_fixture())
        self.client.extract_json.assert_called_once()
        self.sleep.assert_not_called()

    def test_unknown_verdict_is_not_accepted(self):
        invalid = audit_fixture('LOOKS_GOOD')
        self.client.extract_json.side_effect = [invalid, invalid, invalid]
        with self.assertRaisesRegex(LLMError, 'literal_error'):
            self.agent._validated_audit('evidence', '')

    def test_only_validated_responses_are_logged_as_success(self):
        self.client.extract_json.side_effect = [LLMOutputError('Bad JSON', '{bad}'), audit_fixture()]
        with patch('app.core.verification_agent.log_llm2_request'), patch('app.core.verification_agent.log_llm2_response') as log:
            self.agent._validated_audit('evidence', 'qa')
        self.assertFalse(log.call_args_list[0].kwargs['parsed_successfully'])
        self.assertTrue(log.call_args_list[1].kwargs['parsed_successfully'])

    def test_openai_compatible_client_exposes_correctable_output_error(self):
        client = object.__new__(LLMClient)
        client.provider = 'gemini'
        client.model = 'configured-auditor'
        client.client = Mock()
        client.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='{_comment: "bad"}'))])
        with self.assertRaises(LLMOutputError):
            client.extract_json('system', 'evidence')
        self.assertEqual(client.client.chat.completions.create.call_count, 1)

    def test_json_nonfinite_values_and_nonobjects_are_rejected(self):
        for value in ('{"score": NaN}', '{"score": Infinity}', '[]', 'null', ''):
            with self.subTest(value=value), self.assertRaises(LLMOutputError):
                parse_json_object(value, 'gemini')

    def test_prompt_includes_machine_schema_and_prohibits_comments(self):
        self.assertIn('"$defs"', VERIFICATION_SYSTEM_PROMPT)
        self.assertIn('Every property name must be double-quoted', VERIFICATION_SYSTEM_PROMPT)


if __name__ == '__main__':
    unittest.main()
