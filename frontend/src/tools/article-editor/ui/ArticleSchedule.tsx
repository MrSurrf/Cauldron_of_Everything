import { useState } from 'react'
import { Button, Popover, TextInput } from '../../../shared/ui'
import styles from '../ArticleEditor.module.css'

function localDateTime(value: Date) {
  const pad = (number: number) => String(number).padStart(2, '0')
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  }
}

function ScheduleForm({ scheduledFor, onSave, onClose }: {
  scheduledFor: string | null; onSave: (value: string | null) => void; onClose: () => void
}) {
  const [initial] = useState(() => localDateTime(scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 60 * 60 * 1000)))
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [error, setError] = useState('')
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return <form className={styles.schedule} onSubmit={event => {
    event.preventDefault()
    const value = new Date(`${date}T${time}`)
    const roundTrip = localDateTime(value)
    if (!Number.isFinite(value.getTime()) || value.getTime() <= Date.now() || roundTrip.date !== date || roundTrip.time !== time) {
      setError('Выберите существующие дату и время в будущем.'); return
    }
    onSave(value.toISOString()); onClose()
  }}>
    <h2>Отправка на модерацию</h2>
    <p>Сохраните желаемое время отправки вместе с черновиком.</p>
    <div className={styles.scheduleFields}>
      <TextInput type="date" label="Дата отправки" value={date} min={localDateTime(new Date()).date}
        required onChange={event => { setDate(event.target.value); setError('') }} />
      <TextInput type="time" label="Время отправки" value={time} required
        onChange={event => { setTime(event.target.value); setError('') }} />
    </div>
    <p className={styles.muted}>Часовой пояс: {timeZone}.</p>
    <p className={styles.localNotice}>Автоматическая отправка пока не подключена. Дата сохранится только в этом браузере; статья останется черновиком.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.dialogActions}>
      {scheduledFor && <Button type="button" size="sm" variant="secondary" decoration="bare" onClick={() => { onSave(null); onClose() }}>Убрать дату</Button>}
      <Button type="button" size="sm" variant="secondary" decoration="bare" onClick={onClose}>Отмена</Button>
      <Button type="submit" size="sm" decoration="minimal" icon={null}>Сохранить дату</Button>
    </div>
  </form>
}

export function ArticleSchedule({ scheduledFor, onChange }: {
  scheduledFor: string | null; onChange: (value: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  return <Popover modal open={open} onOpenChange={setOpen} aria-label="Настроить время отправки на модерацию"
    content={<ScheduleForm scheduledFor={scheduledFor} onSave={onChange} onClose={() => setOpen(false)} />}>
    <Button size="sm" variant="secondary" decoration="bare" className={styles.scheduleTrigger}>
      <span aria-hidden="true">◷</span>
      {scheduledFor ? `Дата отправки: ${new Date(scheduledFor).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Отложенная отправка'}
    </Button>
  </Popover>
}
