import { describe, expectTypeOf, it } from 'vitest'
import type { ConceptTypeCompactViewProps } from './ConceptTypeCompactView'
import type { ConceptTypeListProps } from './ConceptTypeList'
import type { AuthenticatedConceptTypeWorkspace } from '../types/workspace'

describe('concept type compact contracts', () => {
  it('keeps workspace payload actions assignable to compact view actions', () => {
    expectTypeOf<AuthenticatedConceptTypeWorkspace['onCreateConceptTypeFromPayload']>().toMatchTypeOf<
      ConceptTypeCompactViewProps['onCreateConceptTypeFromPayload']
    >()
    expectTypeOf<AuthenticatedConceptTypeWorkspace['onUpdateConceptTypeFromPayload']>().toMatchTypeOf<
      ConceptTypeCompactViewProps['onUpdateConceptTypeFromPayload']
    >()
  })

  it('keeps list compact callbacks aligned with workspace payload actions', () => {
    expectTypeOf<ConceptTypeListProps['onCreateConceptTypeFromPayload']>().toMatchTypeOf<
      AuthenticatedConceptTypeWorkspace['onCreateConceptTypeFromPayload']
    >()
    expectTypeOf<ConceptTypeListProps['onUpdateConceptTypeFromPayload']>().toMatchTypeOf<
      AuthenticatedConceptTypeWorkspace['onUpdateConceptTypeFromPayload']
    >()
  })
})
