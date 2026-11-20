import { useNavigate } from 'react-router-dom'
import { ArticleEditor } from '../../tools/article-editor'

export default function ArticleEditorPage() {
  const navigate = useNavigate()
  return <ArticleEditor onBack={() => navigate('/articles')} />
}
