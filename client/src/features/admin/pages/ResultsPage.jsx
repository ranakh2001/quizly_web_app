import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { ResultsView } from '../../../components/results/ResultsView.jsx';
import { useT } from '../../../i18n/useT.js';

export default function AdminResultsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <DashboardLayout title={t('results.title')}>
      <div className="editor-toolbar">
        <Button variant="secondary" onClick={() => navigate('/admin/quizzes')}>
          {t('admin.quizList.title')}
        </Button>
      </div>
      <ResultsView quizId={quizId} canReset />
    </DashboardLayout>
  );
}
