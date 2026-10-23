import unittest
from fastapi.testclient import TestClient
from main import app

class TestAIService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertIn("model", data)

    def test_task_breakdown_validation_error_on_empty_payload(self):
        response = self.client.post("/ai/task-breakdown", json={})
        self.assertEqual(response.status_code, 422)

    def test_assistant_validation_error_on_empty_payload(self):
        response = self.client.post("/ai/assistant", json={})
        self.assertEqual(response.status_code, 422)

    def test_meeting_to_tasks_validation_error_on_empty_payload(self):
        response = self.client.post("/ai/meeting-to-tasks", json={})
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()
