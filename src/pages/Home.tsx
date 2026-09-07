import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PRESETS, encodeAnswer, validateAnswer, answerLength, MAX_ANSWER_LENGTH, type Intensity } from '../codec'
import { toast } from '../player/Toast'
import { navigate } from '../router'

const INTENSITY_LABELS: Record<Intensity, string> = { 1: '1 (살짝, 20초쯤)', 2: '2 (기본, 35초쯤)', 3: '3 (MAX, 1분 가까이)' }

/** 작성자 화면. 여기서는 장난 안 침. 정상 동작. */
export default function Home(): React.JSX.Element {
  const [text, setText] = useState('')
  const [intensity, setIntensity] = useState<Intensity>(2)
  const [copied, setCopied] = useState(false)

  const validation = useMemo(() => validateAnswer(text), [text])
  const code = useMemo(() => (validation.ok ? encodeAnswer(validation.text, { intensity }) : null), [validation, intensity])
  const url = code ? `${window.location.origin}/${code}` : null
  const len = answerLength(text)

  const copy = async (): Promise<void> => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast('복사됨. 이제 보내세요')
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast('복사 실패. URL을 직접 드래그하세요')
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 px-5 py-10">
        <header>
          <h1 className="text-3xl font-black">
            대답 <span style={{ color: 'var(--accent)' }}>기계</span>
          </h1>
          <p className="mt-2 text-sm opacity-70">답 대신 URL을 보내세요. 상대는 병맛 연출을 다 본 뒤에야 답을 봅니다.</p>
        </header>

        <section>
          <label className="mb-2 block text-sm font-semibold" htmlFor="answer">
            답변
          </label>
          <textarea
            id="answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={MAX_ANSWER_LENGTH * 2}
            placeholder="예: ㅇㅋ 가자"
            className="w-full rounded-2xl border-2 bg-transparent px-4 py-3 text-lg outline-none focus:border-[var(--accent)]"
            style={{ borderColor: 'color-mix(in srgb, var(--fg) 30%, transparent)' }}
          />
          <div className={`mt-1 text-right text-xs ${len > MAX_ANSWER_LENGTH ? 'text-red-400' : 'opacity-50'}`}>
            {len} / {MAX_ANSWER_LENGTH}
          </div>
          {!validation.ok && text.length > 0 && <p className="text-sm text-red-400">{validation.reason}</p>}
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold">프리셋</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setText(p)} className="btn-ghost text-sm">
                {p}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold">꼴받음 강도</div>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setIntensity(n)}
                className={intensity === n ? 'btn text-sm' : 'btn-ghost text-sm'}
              >
                {INTENSITY_LABELS[n]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-50">3은 3단 확인이 무조건 들어갑니다.</p>
        </section>

        <section className="mt-auto">
          <div className="mb-2 text-sm font-semibold">URL</div>
          <div
            className="min-h-[3.25rem] rounded-2xl border-2 px-4 py-3 font-mono text-sm break-all"
            style={{ borderColor: 'color-mix(in srgb, var(--fg) 30%, transparent)', opacity: url ? 1 : 0.4 }}
          >
            {url ?? '답변을 입력하면 여기 URL이 생깁니다'}
          </div>
          <div className="mt-3 flex gap-2">
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={copy} disabled={!url} className="btn flex-1 disabled:opacity-40">
              {copied ? '복사됨 ✓' : 'URL 복사'}
            </motion.button>
            <button type="button" onClick={() => code && navigate(`/${code}`)} disabled={!code} className="btn-ghost disabled:opacity-40">
              미리보기
            </button>
          </div>
          <p className="mt-3 text-center text-xs opacity-40">서버 없음. 답변은 URL 안에 들어 있음. 같은 문구는 항상 같은 URL.</p>
        </section>
      </div>
    </div>
  )
}
