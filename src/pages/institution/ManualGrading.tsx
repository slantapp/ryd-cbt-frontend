import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ManualGrading() {
  const { testId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (testId) {
      // Redirect to mode selection
      navigate(`/tests/${testId}/grade/select-mode`, { replace: true });
    }
  }, [testId, navigate]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <div className="text-gray-600">Redirecting...</div>
      </div>
    </div>
  );
}

