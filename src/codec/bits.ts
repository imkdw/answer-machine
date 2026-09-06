// 비트열 <-> base64url 문자열 변환 유틸

export const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const B64_INDEX = new Map<string, number>()
for (let i = 0; i < B64URL.length; i++) B64_INDEX.set(B64URL[i]!, i)

export class BitWriter {
  private bits: number[] = []

  write(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1)
    }
  }

  /** 6비트씩 잘라 base64url 문자열로. 남는 비트는 0으로 채운다. */
  toBase64Url(): string {
    let out = ''
    for (let i = 0; i < this.bits.length; i += 6) {
      let v = 0
      for (let j = 0; j < 6; j++) {
        const bit = this.bits[i + j] ?? 0
        v = (v << 1) | bit
      }
      out += B64URL[v]
    }
    return out
  }
}

export class BitReader {
  private bits: number[] = []
  private pos = 0

  constructor(encoded: string) {
    for (const ch of encoded) {
      const v = B64_INDEX.get(ch)
      if (v === undefined) throw new Error(`invalid base64url char: ${ch}`)
      for (let i = 5; i >= 0; i--) this.bits.push((v >>> i) & 1)
    }
  }

  remaining(): number {
    return this.bits.length - this.pos
  }

  read(width: number): number {
    if (this.remaining() < width) throw new Error('unexpected end of bits')
    let v = 0
    for (let i = 0; i < width; i++) {
      v = (v << 1) | this.bits[this.pos++]!
    }
    return v >>> 0
  }
}
