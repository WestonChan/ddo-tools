import { slugFromPathSegment, type Slug } from '../lib/api'

type ApiFixture<Response> = Response extends readonly unknown[]
  ? { [Index in keyof Response]: ApiFixture<Response[Index]> }
  : Response extends object
    ? {
        [Field in keyof Response]: Field extends 'slug' | `${string}_slug`
          ? Response[Field] extends string
            ? Slug
            : Response[Field]
          : ApiFixture<Response[Field]>
      }
    : Response

export function apiFixture<Response>(response: Response): ApiFixture<Response> {
  if (Array.isArray(response)) response.forEach(apiFixture)
  else if (response !== null && typeof response === 'object') {
    for (const [key, value] of Object.entries(response)) {
      if ((key === 'slug' || key.endsWith('_slug')) && value !== null) {
        if (typeof value !== 'string' || slugFromPathSegment(value) === null)
          throw new Error(`Invalid captured slug: ${key}`)
      } else apiFixture(value)
    }
  }
  return response as ApiFixture<Response>
}
