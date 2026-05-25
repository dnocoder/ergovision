# ErgoVision

ErgoVision - готовое web-приложение для анализа посадки пользователя за компьютером. Система работает локально в браузере: получает изображение с веб-камеры, определяет keypoints тела через MoveNet, рассчитывает признаки позы и показывает итоговый уровень риска.

Проект выполнен как финальный MVP для учебного группового проекта по ML/AI systems.

## Что уже готово

- камера и overlay ключевых точек;
- pose-estimation pipeline на базе TensorFlow.js MoveNet;
- demo fallback для проверки без камеры;
- калибровка нормальной посадки;
- расчет признаков позы: наклон головы, наклон плеч, смещение головы, расстояние до камеры, стабильность;
- `riskScore` от 0 до 100;
- уровни риска: low, medium, high;
- сглаживание keypoints и метрик;
- настройки чувствительности, confidence threshold, FPS и smoothing;
- baseline timer;
- график изменения риска за сессию;
- локальная история сессий;
- экспорт отчета в JSON;
- документация, eval-plan, QA checklist и demo script.

## Запуск

```bash
npm install
npm run dev
```

После запуска открыть:

```text
http://127.0.0.1:5173
```

Production-сборка:

```bash
npm run build
```

Preview production-сборки:

```bash
npm run preview
```

## Загрузка модели MoveNet

При `npm install` автоматически запускается `postinstall`-скрипт `scripts/download-movenet.mjs`. Он скачивает MoveNet Lightning в локальную папку `public/models/movenet-lightning/`, чтобы приложение могло запускать pose-estimation без ожидания загрузки модели из TFHub во время демонстрации.

Если локальная модель отсутствует или скачать ее не получилось, приложение попробует загрузить MoveNet из TFHub при запуске.

Если нужно пропустить скачивание модели при установке, например без интернета, в PowerShell выполните:

```powershell
$env:ERGOVISION_SKIP_MODEL_DOWNLOAD='1'
npm install
Remove-Item Env:\ERGOVISION_SKIP_MODEL_DOWNLOAD
```

В Git Bash, Linux или macOS:

```bash
ERGOVISION_SKIP_MODEL_DOWNLOAD=1 npm install
```

Скачать модель вручную после установки можно командой:

```bash
npm run download:movenet
```

Если сеть медленная, можно увеличить таймаут скачивания:

```powershell
$env:ERGOVISION_MODEL_DOWNLOAD_TIMEOUT_MS='120000'
npm run download:movenet
Remove-Item Env:\ERGOVISION_MODEL_DOWNLOAD_TIMEOUT_MS
```

## Как пользоваться

1. Откройте приложение и разрешите доступ к камере.
2. Сядьте ровно перед камерой.
3. Нажмите калибровку, чтобы сохранить baseline нормальной посадки.
4. Запустите анализ.
5. Следите за risk score, метриками, графиком и подсказками.
6. При необходимости откройте настройки и измените чувствительность или сглаживание.
7. После сессии сохраните JSON-отчет.

Если камера недоступна, приложение может работать в demo fallback режиме.

## AI-компонент

ErgoVision использует готовую browser-based pose-estimation модель MoveNet из `@tensorflow-models/pose-detection`. Модель возвращает keypoints тела, а проектный AI/CV слой рассчитывает собственные метрики посадки.

| Признак | Что показывает |
|---|---|
| Head tilt | Отклонение головы от нормального положения |
| Shoulder tilt | Разницу высоты левого и правого плеча |
| Head offset | Смещение головы относительно центра плеч |
| Distance | Относительное расстояние пользователя до камеры |
| Stability | Насколько сильно меняется поза между кадрами |

Итоговая оценка:

| Risk score | Интерпретация |
|---:|---|
| 0-30 | Нормальная посадка |
| 31-60 | Средний риск |
| 61-100 | Высокий риск |

## Baseline и Improved

| Версия | Описание |
|---|---|
| Baseline | Таймер напоминает пользователю проверить посадку, но не анализирует изображение |
| Improved | AI-модуль анализирует keypoints с камеры и предупреждает только при признаках неправильной посадки |

Польза AI-компонента в том, что система реагирует на фактическое положение пользователя, а не просто на прошедшее время.

## Архитектура

```text
src/
  ai/
    poseModel.ts          # загрузка и запуск MoveNet
    postureMetrics.ts     # расчет признаков посадки
    riskScoring.ts        # итоговый risk score
    poseSmoothing.ts      # сглаживание keypoints и метрик
  components/
    CameraPanel.tsx       # камера и keypoint overlay
    MetricsPanel.tsx      # текущие метрики
    RiskGauge.tsx         # индикатор риска
    SessionChart.tsx      # график сессии
    HistoryPanel.tsx      # история результатов
    SettingsPanel.tsx     # настройки анализа
  storage/
    sessionStore.ts       # localStorage
  types/
    pose.ts               # типы pose/result/session/settings
  App.tsx                 # интеграция сценария
```

## Стек

- React 18
- TypeScript
- Vite 5
- TensorFlow.js
- MoveNet / `@tensorflow-models/pose-detection`
- Recharts
- LocalStorage
- CSS

## Документация

Заполненные материалы проекта лежат в `docs/`:

| Файл | Содержание |
|---|---|
| `docs/project-brief.md` | паспорт проекта |
| `docs/moscow-mvp.md` | MoSCoW и состав MVP |
| `docs/roadmap.md` | план этапов |
| `docs/analogs-analysis.md` | анализ аналогов |
| `docs/ai-quality-evaluation.md` | оценка качества AI |
| `docs/time-estimate.md` | оценка сроков |
| `docs/cost-estimate.md` | расчет стоимости |
| `docs/ai-adaptation-checklist.md` | чек-лист AI-адаптации |
| `docs/pitch-template.md` | сценарий питча |

QA-материалы лежат в `qa/`:

| Файл | Содержание |
|---|---|
| `qa/eval-set.md` | eval-set на 20 сценариев |
| `qa/demo-script.md` | сценарий демонстрации |
| `qa/metrics-template.md` | шаблон метрик |
| `qa/qa-checklist.md` | чек-лист проверки |

## Распределение ролей

| Участник | Ответственность |
|---|---|
| Kirill | AI/CV: MoveNet, keypoints, posture metrics, scoring, smoothing |
| Server | Frontend: камера, dashboard, графики, настройки, стили |
| Lenara | Integration: App state, analysis loop, LocalStorage, export, build |
| Emir | Docs/QA: README, project brief, eval-plan, demo script, QA checklist |

## Ограничения

- проект не является медицинской диагностикой;
- качество зависит от камеры, освещения и видимости плеч/головы;
- видео не сохраняется и не отправляется на сервер;
- Vite может предупреждать о больших chunks из-за TensorFlow.js, это ожидаемо для текущего MVP.
