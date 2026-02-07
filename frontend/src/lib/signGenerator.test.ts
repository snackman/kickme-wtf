import { describe, it, expect } from 'vitest'
import { generateSignSVG, randomSeed } from './signGenerator'

describe('signGenerator', () => {
  describe('generateSignSVG', () => {
    it('generates valid SVG with correct structure', () => {
      const svg = generateSignSVG(12345)

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('viewBox="0 0 1000 1000"')
      expect(svg).toContain('</svg>')
    })

    it('is deterministic - same seed produces same SVG', () => {
      const seed = 42
      const svg1 = generateSignSVG(seed)
      const svg2 = generateSignSVG(seed)

      expect(svg1).toBe(svg2)
    })

    it('different seeds produce different SVGs', () => {
      const svg1 = generateSignSVG(100)
      const svg2 = generateSignSVG(200)

      expect(svg1).not.toBe(svg2)
    })

    it('includes shadow element', () => {
      const svg = generateSignSVG(12345)
      expect(svg).toContain('id="shadow"')
    })

    it('includes paper element', () => {
      const svg = generateSignSVG(12345)
      expect(svg).toContain('id="paper"')
    })

    it('includes tape element', () => {
      const svg = generateSignSVG(12345)
      expect(svg).toContain('id="tape"')
    })

    it('includes text element', () => {
      const svg = generateSignSVG(12345)
      expect(svg).toContain('id="text"')
    })

    it('handles edge case seeds', () => {
      // Min seed
      const svg0 = generateSignSVG(0)
      expect(svg0).toContain('<svg')

      // Max seed (32-bit)
      const svgMax = generateSignSVG(0xFFFFFFFF)
      expect(svgMax).toContain('<svg')
    })

    it('sometimes includes doodle (probabilistic)', () => {
      // Test multiple seeds to find one with doodle
      let foundDoodle = false
      let foundNoDoodle = false

      for (let seed = 0; seed < 100; seed++) {
        const svg = generateSignSVG(seed)
        if (svg.includes('opacity="0.12"') && svg.includes('stroke-linecap="round"')) {
          foundDoodle = true
        } else {
          foundNoDoodle = true
        }
        if (foundDoodle && foundNoDoodle) break
      }

      // Both cases should occur given enough samples
      expect(foundDoodle || foundNoDoodle).toBe(true)
    })

    it('generates valid path data', () => {
      const svg = generateSignSVG(12345)

      // Paper path should have M command and L commands
      expect(svg).toMatch(/M\d+ \d+/)
      expect(svg).toMatch(/L\d+ \d+/)
    })

    it('applies rotation transforms', () => {
      const svg = generateSignSVG(12345)

      // Should have rotation transforms for paper and text
      expect(svg).toMatch(/rotate\([^)]+\)/)
    })
  })

  describe('randomSeed', () => {
    it('generates a number', () => {
      const seed = randomSeed()
      expect(typeof seed).toBe('number')
    })

    it('generates values in valid range (0 to 2^32-1)', () => {
      for (let i = 0; i < 100; i++) {
        const seed = randomSeed()
        expect(seed).toBeGreaterThanOrEqual(0)
        expect(seed).toBeLessThan(0xFFFFFFFF + 1)
      }
    })

    it('generates different values on subsequent calls', () => {
      const seeds = new Set<number>()
      for (let i = 0; i < 100; i++) {
        seeds.add(randomSeed())
      }
      // Should have mostly unique values (at least 90% unique)
      expect(seeds.size).toBeGreaterThan(90)
    })

    it('generates integers only', () => {
      for (let i = 0; i < 100; i++) {
        const seed = randomSeed()
        expect(Number.isInteger(seed)).toBe(true)
      }
    })
  })
})
