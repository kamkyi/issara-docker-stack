from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import QueryDict
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from issara.ilm_server_2.serializers import PartnerMessageBoardSerializer


class PartnerMessageBoardAudienceTests(SimpleTestCase):
    """Regression cover for the 'sent to everyone' incident.

    Pure serializer logic only (no DB): a custom multi-select audience must be
    persisted as an explicit id snapshot, and an audience-less post must be
    rejected rather than silently broadcasting to every partner.
    """

    def test_custom_multi_select_ids_are_persisted(self):
        serializer = PartnerMessageBoardSerializer()
        data = {"audience_partner_ids": [11, 22, 33]}
        serializer._consume_audience_alias(data)
        self.assertEqual(data["audience_partner_ids"], [11, 22, 33])
        self.assertIsNone(data["audience_grouping"])
        self.assertFalse(data["audience_all"])
        self.assertIsNone(data["strategic_partner"])

    def test_broadcast_requires_explicit_flag(self):
        serializer = PartnerMessageBoardSerializer()
        data = {"strategic_partner_all": True}
        serializer._consume_audience_alias(data)
        self.assertTrue(data["audience_all"])
        self.assertIsNone(data["audience_grouping"])
        self.assertIsNone(data["audience_partner_ids"])

    def test_validate_rejects_audienceless_create(self):
        serializer = PartnerMessageBoardSerializer()
        with self.assertRaises(ValidationError):
            serializer.validate({"title": "Welcome"})

    def test_validate_accepts_explicit_ids(self):
        serializer = PartnerMessageBoardSerializer()
        attrs = {"audience_partner_ids": [11, 22]}
        self.assertEqual(serializer.validate(attrs), attrs)

    def test_validate_accepts_explicit_broadcast(self):
        serializer = PartnerMessageBoardSerializer()
        attrs = {"strategic_partner_all": True}
        self.assertEqual(serializer.validate(attrs), attrs)

    def test_single_attachment_is_not_iterated_into_chunks(self):
        """Regression: one uploaded file must stay a 1-element list, not be
        collapsed to a bare UploadedFile that ListField(FileField) iterates
        chunk-by-chunk ('The submitted data was not a file' per chunk)."""
        pdf = SimpleUploadedFile(
            "test.pdf", b"%PDF-1.4 hello world", content_type="application/pdf"
        )
        qd = QueryDict(mutable=True)
        qd.update(
            {
                "post_type": "announcement",
                "title": "Test For Draft",
                "description": "<p>Test</p>",
                "name": "Test For Draft",
                "status": "draft",
                "audience_partner_ids": "[49,32]",
                "pinned": "false",
                "ack_required": "false",
            }
        )
        qd["attachment_files"] = pdf

        serializer = PartnerMessageBoardSerializer()
        attrs = serializer.to_internal_value(qd)

        files = attrs.get("attachment_files")
        self.assertIsInstance(files, list)
        self.assertEqual(len(files), 1)
        self.assertEqual(files[0].name, "test.pdf")
        # The custom multi-select audience must survive the same flatten pass.
        self.assertEqual(attrs.get("audience_partner_ids"), [49, 32])
