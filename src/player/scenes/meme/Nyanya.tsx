import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { NYANYA } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const AUTO_AT = 2600
const STORM_AT = 4200
const FEED_GAP = 400
const FEED_POOL = ['냐냐냥', '냐냐냥!!!', '냐냥', '냐냐냥 ㅋㅋ', '냐냐냥!!!!!!', '냐?']
const USERS = ['cat_lover', 'nyan_99', 'jjal_bot', 'user4832', 'mz_office', 'yeongkk']

interface Comment {
  id: number
  user: string
  text: string
  mine?: boolean
}

/** 냐냐냥. 입력창에 냐냐냥 쳐야 다음 내용. 안 치면 대신 쳐줌. */
export default function Nyanya({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const prompt = useMemo(() => pick(NYANYA.prompt, rng), [rng])
  const [value, setValue] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [storm, setStorm] = useState(false)
  const submittedRef = useRef(false)
  const doneRef = useRef(false)
  const seq = useRef(0)
  const timersRef = useRef<number[]>([])

  const later = (fn: () => void, ms: number): void => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  const submit = (text: string): void => {
    const v = text.trim()
    if (!v) return
    submittedRef.current = true
    if (v.includes('냐냐냥')) {
      toast(pick(NYANYA.ok, rng))
      audio.sfx('ding')
    } else {
      toast(pick(NYANYA.wrong, rng))
      audio.sfx('error')
    }
    setComments((c) => [...c, { id: ++seq.current, user: '나', text: v, mine: true }])
    setValue('')
    later(() => {
      audio.sfx('kakao')
      setComments((c) => [...c, { id: ++seq.current, user: '🐱', text: '냐냐냥!!!' }])
    }, 500)
  }

  useEffect(() => {
    const timers = timersRef.current
    // 남들 댓글
    const feedCount = Math.floor((STORM_AT - 400) / FEED_GAP)
    for (let i = 0; i < feedCount; i++) {
      timers.push(
        window.setTimeout(() => {
          setComments((c) => [...c.slice(-6), { id: ++seq.current, user: pick(USERS, rng), text: pick(FEED_POOL, rng) }])
        }, 400 + i * FEED_GAP),
      )
    }
    // 자동 입력
    timers.push(
      window.setTimeout(() => {
        if (submittedRef.current) return
        toast(pick(NYANYA.timeout, rng))
        const steps = ['냐', '냐냐', '냐냐냥']
        steps.forEach((s, i) => {
          timers.push(
            window.setTimeout(() => {
              if (submittedRef.current) return
              audio.sfx('typing')
              setValue(s)
              if (i === steps.length - 1) timers.push(window.setTimeout(() => submit(s), 250))
            }, i * 220),
          )
        })
      }, AUTO_AT),
    )
    timers.push(
      window.setTimeout(() => {
        setStorm(true)
        audio.sfx('sparkle')
      }, STORM_AT),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
    // submit은 최신 클로저 필요 없음 (audio/rng 고정)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, rng])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const cats = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        e: rng() < 0.5 ? '🐱' : '🐈',
        x: rng() * 100,
        delay: rng() * 0.4,
        size: 1.5 + rng() * 2,
      })),
    [rng],
  )

  const onKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') submit(value)
  }

  return (
    <SceneFrame style={{ background: '#fafafa', color: '#111', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }}>
      <div className="relative z-10 flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        {/* 포스트 헤더 */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-yellow-300 text-lg">🐱</div>
          <div className="text-sm font-bold">nyanya_official</div>
          <div className="ml-auto text-gray-400">...</div>
        </div>
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-yellow-100 to-pink-100 text-5xl">🐈‍⬛</div>
        <div className="px-3 py-2 text-left text-sm">
          <span className="font-bold">nyanya_official</span> {prompt}
        </div>

        {/* 댓글 */}
        <div className="flex h-36 flex-col gap-1 overflow-hidden px-3 text-left text-xs">
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-lg px-2 py-1 ${c.mine ? 'bg-yellow-100 font-bold' : ''}`}>
                <span className="mr-1 font-bold text-gray-600">{c.user}</span>
                {c.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 입력 */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={NYANYA.placeholder}
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
            aria-label="댓글 입력"
          />
          <button type="button" className="rounded-full bg-[#ff2d95] px-3 py-2 text-xs font-bold text-white active:scale-95" onClick={() => submit(value)}>
            입력
          </button>
        </div>
      </div>

      {storm && (
        <>
          {cats.map((c) => (
            <motion.span
              key={c.id}
              className="pointer-events-none absolute z-20 select-none"
              style={{ left: `${c.x}%`, fontSize: `${c.size}rem` }}
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              transition={{ delay: c.delay, duration: 0.9, ease: 'easeIn' }}
            >
              {c.e}
            </motion.span>
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: [0, 1.3, 1], rotate: -3 }}
            transition={{ duration: 0.4 }}
            className="meme-caption absolute inset-x-2 bottom-24 z-30 text-center text-2xl"
            style={{ whiteSpace: 'normal' }}
          >
            냐냐냥 접수 완료. 답변은 다음 편에
          </motion.div>
        </>
      )}
    </SceneFrame>
  )
}
