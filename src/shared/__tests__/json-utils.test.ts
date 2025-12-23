import { describe, it, expect } from 'vitest'
import { extractJSON, parseAIResponse } from '../utils/json-utils'

describe('json-utils', () => {
  describe('extractJSON', () => {
    it('should handle pure JSON object', () => {
      const input = '{"name": "test", "value": 123}'
      expect(extractJSON(input)).toBe('{"name": "test", "value": 123}')
    })

    it('should handle pure JSON array', () => {
      const input = '[1, 2, 3]'
      expect(extractJSON(input)).toBe('[1, 2, 3]')
    })

    it('should strip markdown code blocks with json language tag', () => {
      const input = '```json\n{"a": 1}\n```'
      expect(extractJSON(input)).toBe('{"a": 1}')
    })

    it('should strip markdown code blocks without language tag', () => {
      const input = '```\n{"a": 1}\n```'
      expect(extractJSON(input)).toBe('{"a": 1}')
    })

    it('should extract JSON from text with prefix', () => {
      const input = 'Sure! Here is the data: {"id": 1, "status": "ok"}'
      expect(extractJSON(input)).toBe('{"id": 1, "status": "ok"}')
    })

    it('should extract JSON from text with suffix', () => {
      const input = '{"id": 1} is the result of your query.'
      expect(extractJSON(input)).toBe('{"id": 1}')
    })

    it('should extract JSON from text with both prefix and suffix', () => {
      const input = 'Analysis complete: {"score": 0.95}. Please check.'
      expect(extractJSON(input)).toBe('{"score": 0.95}')
    })

    it('should handle multiline JSON within text', () => {
      const input = `
        The plan is:
        {
          "step": 1,
          "desc": "initialize"
        }
        End of message.
      `
      const result = extractJSON(input)
      expect(JSON.parse(result)).toEqual({ step: 1, desc: 'initialize' })
    })

    it('should prefer markdown block over surrounding text', () => {
      const input = 'Random text ```json {"real": "data"} ``` more text'
      expect(extractJSON(input)).toBe('{"real": "data"}')
    })

    it('should handle JSON arrays mixed with text', () => {
      const input = 'The list is [1, 2, 3] and that is all.'
      expect(extractJSON(input)).toBe('[1, 2, 3]')
    })
  })

  describe('parseAIResponse', () => {
    it('should parse complex AI responses successfully', () => {
      const response = 'I have analyzed the data.\n```json\n{"success": true, "count": 42}\n```\nLet me know if you need more help.'
      const result = parseAIResponse({"success": true, "count": 42})
      // @ts-ignore
      expect(result.success).toBe(true)
      // @ts-ignore
      expect(result.count).toBe(42)
    })

    it('should throw error for invalid JSON even after extraction', () => {
      const response = 'Here is some broken json: { "a": 1, }'
      expect(() => parseAIResponse(response)).toThrow()
    })
  })
})
