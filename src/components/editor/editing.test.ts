import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The stage, read from the source.
 *
 * What is under test here is which listeners a double-click installs and what
 * each key does inside them, and that is a shape of code rather than a result
 * jsdom can produce: `contenteditable`, focus and the caret are things a real
 * browser does.
 */
const source = readFileSync(resolve(process.cwd(), 'src/components/editor/index.tsx'), 'utf8')

/** The body of one of the editor's handlers, up to its closing brace. */
const handler = (name: string) => {
  const start = source.indexOf(`const ${name} = `)
  expect(start, name).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('\n  }\n', start))
}

describe('typing into the design', () => {
  const typing = handler('onStageDoubleClick')

  /**
   * What shipped broken: double-click opened the node for typing with nothing
   * on screen to say so and no way out but clicking elsewhere. Enter put a
   * line break in a button, Escape did nothing, and a double-click that typed
   * nothing still left an undo step and an unsaved change.
   */
  it('finishes on Enter and puts the text back on Escape', () => {
    expect(typing).toContain("key.key === 'Enter' && !key.shiftKey")
    expect(typing).toContain('node.blur()')
    expect(typing).toContain("key.key === 'Escape'")
    expect(typing).toContain('finish(false)')
    expect(typing).toContain('node.innerHTML = before')
  })

  it('says that it is a mode, on the node being typed into', () => {
    expect(typing).toContain('setEditing(true)')
    expect(source).toContain('Enter finishes, Esc puts it back')
    expect(source).toContain("editing && 'border-dashed'")
  })

  // The undo step is taken at the first keystroke, so a double-click that
  // typed nothing leaves nothing to undo and nothing to save.
  it('records an undo step only once something was typed', () => {
    expect(typing).not.toContain('snapshot()')
    expect(typing).toContain("addEventListener('input', onInput)")
    expect(typing).toContain('past.current.push({ html: rootBefore, selectedId: id })')
  })

  // Typing can add or remove elements, and every id below is positional.
  it('restamps the node it typed into', () => {
    expect(typing).toContain('restamp(node)')
  })
})

describe('what a click lands on', () => {
  it('selects the sentence a bold word belongs to', () => {
    expect(handler('nodeFor')).toContain('layerOf(node, root)')
  })

  /**
   * What shipped broken: the Content field wrote `textContent`, so it was
   * withheld from any node with an element inside it, which is every button
   * with an icon. Typing a space in the field also lost it, which the field
   * itself now handles; this is the write.
   */
  it('changes the words of a node and leaves what else is in it alone', () => {
    expect(handler('onText')).toContain('setDirectText(selected, text)')
    expect(source).not.toContain('selected.textContent = text')
    const properties = readFileSync(
      resolve(process.cwd(), 'src/components/editor/properties.tsx'),
      'utf8',
    )
    expect(properties).toContain('const ContentField')
    expect(properties).toContain("(isTextEditable(element) || directText(element) !== '')")
  })
})

describe('dragging', () => {
  /**
   * What shipped broken: the drop line said where between two things the
   * element would go and nothing about what it would go into, so a card
   * dragged to the edge of a grid could be joining the grid or leaving it for
   * the section behind, and the line looked the same either way.
   */
  it('outlines and names the container that will receive the drop', () => {
    expect(handler('onMoveStart')).toContain('showHost(container ?? root)')
    expect(source).toContain('Into {dropTarget.name}')
  })

  /**
   * What shipped broken: undo after a move put the element back and left
   * nothing selected, so the thing that had just moved was the one thing not
   * highlighted.
   */
  it('keeps the selection on the moved node through undo', () => {
    expect(handler('onMoveStart')).toContain('snapshot(node.getAttribute(NODE_ATTR))')
    expect(handler('onDropLayer')).toContain('snapshot(movingId)')
    expect(handler('restore')).toContain('setSelectedId(entry.selectedId)')
  })
})
