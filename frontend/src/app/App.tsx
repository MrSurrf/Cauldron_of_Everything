import { SurveyApp } from '../tools/survey'

/**
 * Корневая оболочка приложения.
 *
 * Пока новый workspace находится в разработке, оболочка запускает существующий
 * опросник без изменения его пользовательского сценария.
 */
function App() {
  return <SurveyApp />
}

export default App
