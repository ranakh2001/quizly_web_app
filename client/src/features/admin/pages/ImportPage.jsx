import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AdminImportPage() {
  const { t } = useT();
  return (
    <DashboardLayout title={t('admin.import.title')}>
      <ImportSection
        endpoint="/admin/imports/students"
        titleKey="admin.import.studentsTitle"
        hintKey="admin.import.studentsHint"
      />
      <ImportSection
        endpoint="/admin/imports/teachers"
        titleKey="admin.import.teachersTitle"
        hintKey="admin.import.teachersHint"
      />
    </DashboardLayout>
  );
}

function ImportSection({ endpoint, titleKey, hintKey }) {
  const { t } = useT();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  function handleFileChange(event) {
    setFile(event.target.files[0] ?? null);
    setReport(null);
    setErrorKey(null);
  }

  async function handleUpload() {
    if (!file) {
      setErrorKey('admin.import.selectFileFirst');
      return;
    }
    setUploading(true);
    setErrorKey(null);
    setReport(null);
    try {
      const contentBase64 = await readFileAsBase64(file);
      const data = await api.post(endpoint, { filename: file.name, contentBase64 });
      setReport(data.report);
      setFile(null);
    } catch (error) {
      setErrorKey(errorMessageKey(error, { fallback: 'admin.import.errorGeneric' }));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass editor-panel">
      <h2 className="editor-panel__title">{t(titleKey)}</h2>
      <p className="intro-card__note">{t(hintKey)}</p>

      <div className="import-file-row">
        <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
        <Button onClick={handleUpload} disabled={uploading}>
          {uploading ? t('admin.import.uploading') : t('admin.import.uploadButton')}
        </Button>
      </div>

      {errorKey && (
        <p className="form-error" role="alert">
          {t(errorKey)}
        </p>
      )}

      {report && (
        <div className="import-report">
          <p>
            {t('admin.import.createdLabel')}: {report.createdCount} ·{' '}
            {t('admin.import.updatedLabel')}: {report.updatedCount}
          </p>
          {report.rejected.length > 0 && (
            <>
              <p>
                {t('admin.import.rejectedLabel')}: {report.rejected.length}
              </p>
              {/* Rejection reasons come from the uploaded file's own data (e.g. an unknown
                  class name found in a row) - inherently untranslatable, shown as-is. */}
              <ul className="import-report__rejected">
                {report.rejected.map((row) => (
                  <li key={row.row}>{t('admin.import.rejectedRow', row)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
