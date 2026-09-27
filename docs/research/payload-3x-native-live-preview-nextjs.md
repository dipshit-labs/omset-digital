# Payload 3.x Native Live Preview with Next.js App Router Architecture

**Author:** Technical Architecture Research  
**Date:** September 2026  
**Status:** Completed  
**Target Repository:** Omset Digital  

---

## 1. Executive Summary

Payload 3.x implements visual live preview inside the admin panel through an embedded iframe or popup window communicating across window boundaries via `window.postMessage`. In Next.js App Router applications, Payload 3.x provides two distinct live preview architectures:

1. **Server-side Live Preview (React Server Components).** This is the production pattern implemented in `templates/website` and `templates/ecommerce`. The preview iframe runs Next.js in Draft Mode (`draftMode().enable()`). The collection enables version autosave with a low debounce interval (`interval: 100`). As editors edit document fields, Payload admin autosaves the draft to the database and dispatches a `payload-document-event` message. A lightweight client listener component (`RefreshRouteOnSave`) receives this event and calls Next.js App Router's `router.refresh()`. React Server Components re-execute on the server, fetch the uncommitted draft document via Payload Local API with `draft: true` and `overrideAccess: true`, and stream the updated UI back to the browser. Storefront sections remain pure React Server Components with zero client-side JavaScript bundle overhead.
2. **Client-side Live Preview (In-Memory State Merging).** Documented in `@payloadcms/live-preview` and `@payloadcms/live-preview-react` (`useLivePreview`). As editors type into admin form fields, Payload admin dispatches `payload-live-preview` messages containing unsaved form values. A client-side hook intercepts these messages and queries Payload's REST API using `X-Payload-HTTP-Method-Override: GET` to populate relationships and uploads on uncommitted data without persisting to the database, updating local React client state on each keystroke.

This research analyzes the source code of `templates/website`, `@payloadcms/live-preview`, `@payloadcms/live-preview-react`, and `@payloadcms/ui` from the official Payload 3.x repository. It details collection configuration, preview route security, draft document queries, and client-side hydration protocols.

---

## 2. Primary Sources Consulted

All findings in this document are drawn directly from the official Payload repository (`payloadcms/payload` branch `3.x`):

- **Template implementation (`templates/website`):**
  - `templates/website/src/payload.config.ts`: Root admin breakpoint definitions and server URL setup.
  - `templates/website/src/collections/Pages/index.ts`: Collection-level `admin.livePreview`, `admin.preview`, and version autosave configuration.
  - `templates/website/src/collections/Posts/index.ts`: Post collection live preview configuration.
  - `templates/website/src/utilities/generatePreviewPath.ts`: URL encoding and preview route parameter formatting.
  - `templates/website/src/app/(frontend)/next/preview/route.ts`: Next.js App Router preview route handler, secret verification, user authentication, and draft mode activation.
  - `templates/website/src/app/(frontend)/next/exit-preview/route.ts`: Companion route to disable draft mode.
  - `templates/website/src/app/(frontend)/[slug]/page.tsx`: RSC page loading drafts with `draftMode()`, `payload.find({ draft: true, overrideAccess: true })`, and conditional listener rendering.
  - `templates/website/src/components/LivePreviewListener/index.tsx`: Client component bridging `@payloadcms/live-preview-react` to Next.js `useRouter`.
  - `templates/website/src/components/AdminBar/index.tsx`: Admin bar handling auth state and preview exit.
  - `templates/website/next.config.ts`: Next.js 15 build configuration and image remote patterns.
- **Admin UI preview engine (`packages/ui`):**
  - `packages/ui/src/providers/LivePreview/index.tsx`: Live preview context, iframe/popup window management, breakpoint sizing, and `ready` event listener.
  - `packages/ui/src/elements/LivePreview/Window/index.tsx`: PostMessage dispatchers for `payload-live-preview` (form state) and `payload-document-event` (document save/autosave).
- **Live preview client packages (`packages/live-preview` and `packages/live-preview-react`):**
  - `packages/live-preview/src/ready.ts`: Client readiness handshake sender.
  - `packages/live-preview/src/isDocumentEvent.ts`: Origin and event type validator for save/autosave events.
  - `packages/live-preview/src/isLivePreviewEvent.ts`: Origin and event type validator for keystroke form state events.
  - `packages/live-preview/src/handleMessage.ts` & `mergeData.ts`: Uncommitted form state cache and relationship population pipeline.
  - `packages/live-preview-react/src/RefreshRouteOnSave.tsx`: Client component invoking router refresh upon document events.
  - `packages/live-preview-react/src/useLivePreview.ts`: React client hook for in-memory live data synchronization.
- **Payload documentation and tests:**
  - `docs/live-preview/overview.mdx`, `server.mdx`, `client.mdx`, `frontend.mdx`: Official architecture guides.
  - `test/live-preview/int.spec.ts`: Integration test suite validating relationship and block population over postMessage.

---

## 3. Collection Configuration (`admin.livePreview`)

### 3.1 Root Admin Configuration

In `templates/website/src/payload.config.ts`, global live preview settings are configured under `admin.livePreview`:

```ts
export default buildConfig({
  admin: {
    // ...
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // ...
})
```

`breakpoints` define the device viewport dimensions selectable in the live preview top toolbar. The admin provider (`LivePreviewProvider` in `packages/ui/src/providers/LivePreview/index.tsx`) automatically prepends a `responsive` breakpoint with `width: '100%'` and `height: '100%'` so editors can freely resize the panel.

### 3.2 Collection-Level Live Preview Settings

In `templates/website/src/collections/Pages/index.ts`, collections define `admin.livePreview` and `admin.preview`:

```ts
export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'pages',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  // ...
  versions: {
    drafts: {
      autosave: {
        interval: 100, // Debounce interval in milliseconds
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
```

Key observations:

1. **Difference between `admin.livePreview` and `admin.preview`.** `admin.preview` sets the URL opened when an editor clicks the traditional "Preview" button in a separate browser tab. `admin.livePreview` sets the iframe `src` used when opening the split-screen live preview canvas inside the admin panel. In `templates/website`, both point to `generatePreviewPath`.
2. **Arguments supplied to `url`.** The `url` resolver receives an object containing `{ data, documentInfo, locale, collectionConfig, globalConfig, req }`. `data` reflects the current form state, including unsaved edits.
3. **Conditional preview suppression.** Returning `null` or `undefined` disables live preview for that document state (for example, if the document does not yet have a valid slug or if the current user lacks preview permissions).
4. **Draft autosave requirement.** For server-side live preview, `versions.drafts.autosave.interval` must be set to a low interval such as `100` milliseconds. Server-side live preview triggers re-renders on document save events rather than individual keystroke form state messages. Fast autosaving bridges the gap between typing and server updates.

### 3.3 Preview Path Resolution

The helper `templates/website/src/utilities/generatePreviewPath.ts` constructs the preview entry URL:

```ts
import { PreviewSearchParams } from '@/app/(frontend)/next/preview/route'
import { PayloadRequest, CollectionSlug } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = ({ collection, slug }: Props) => {
  if (slug === undefined || slug === null) {
    return null
  }

  // Encode to support slugs with special characters
  const encodedSlug = encodeURIComponent(slug)

  const encodedParams = new URLSearchParams({
    path: `${collectionPrefixMap[collection]}/${encodedSlug}`,
    previewSecret: process.env.PREVIEW_SECRET || '',
  } satisfies PreviewSearchParams)

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
```

The function returns a relative path pointing to `/next/preview`. In `LivePreviewProvider`, Payload converts relative paths to absolute URLs using `window.location.origin` if the app runs on the same domain, or uses `req` headers when previewing against external domains.

---

## 4. Next.js Preview Route and Authentication

The preview entry point lives at `templates/website/src/app/(frontend)/next/preview/route.ts`. It acts as an authentication gate and draft session initiator before redirecting to the requested page.

### 4.1 Route Implementation

```ts
import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { getSafeRedirect } from 'payload/shared'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'

export type PreviewSearchParams = {
  path: string
  previewSecret: string
}

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  if (!path) {
    return new Response('Insufficient search params', { status: 404 })
  }

  const safePath = getSafeRedirect({ fallbackTo: '', redirectTo: path })

  if (!safePath) {
    return new Response('This endpoint can only be used for relative previews', { status: 500 })
  }

  let user

  try {
    const authResult = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
    user = authResult.user
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying token for live preview')
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const draft = await draftMode()

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  draft.enable()

  redirect(safePath)
}
```

### 4.2 Security and Verification Layers

1. **Shared Secret Verification.** Verifies `previewSecret === process.env.PREVIEW_SECRET`. This prevents unauthorized external callers from triggering preview route handshakes.
2. **Open Redirect Mitigation.** Uses `getSafeRedirect({ fallbackTo: '', redirectTo: path })` from `payload/shared`. If `path` contains an absolute URI pointing to an external domain or begins with malicious protocols, `getSafeRedirect` returns an empty string, rejecting the request with HTTP 500.
3. **Payload Session Authentication.** Calls `payload.auth({ req, headers: req.headers })`. This verifies the incoming session cookie (the HTTP-only Payload JWT cookie) sent by the browser. If the user is unauthenticated or the token is expired, the route calls `draft.disable()` and returns HTTP 403.
4. **Draft Mode Cookie Activation.** Calls `draft.enable()` from `next/headers`. In Next.js, this sets the `__prerender_bypass` cookie. All subsequent requests in this browser context bypass Next.js static caching and execute dynamic server rendering.
5. **Safe Server Redirect.** Calls `redirect(safePath)` to send the browser to the rendered storefront route.

### 4.3 Exit Preview Route

A companion endpoint at `templates/website/src/app/(frontend)/next/exit-preview/route.ts` clears the preview session:

```ts
import { draftMode } from 'next/headers'

export async function GET(): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  return new Response('Draft mode is disabled')
}
```

The storefront `AdminBar` component calls this endpoint when the editor clicks "Exit Preview", clearing the Next.js draft cookie and refreshing the route back to the published version.

---

## 5. Draft Document Loading in React Server Components

Once Draft Mode is enabled, page components load drafts dynamically via Payload's Local API.

### 5.1 Route Page Structure

From `templates/website/src/app/(frontend)/[slug]/page.tsx`:

```tsx
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import configPromise from '@payload-config'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RenderHero } from '@/heros/RenderHero'
import { RenderBlocks } from '@/blocks/RenderBlocks'

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug

  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}
```

### 5.2 Draft Query Implementation

The data fetcher uses React's `cache` utility to deduplicate queries between the page component and `generateMetadata`:

```ts
const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
```

Two query parameters govern draft resolution:

1. **`draft: draft` (`draft: true`).** Instructs Payload Local API to search the versions collection for the latest draft revision rather than limiting results to documents with `_status === 'published'`.
2. **`overrideAccess: draft` (`overrideAccess: true`).** Collection read access rules typically enforce `read: authenticatedOrPublished`. When draft mode is active, `overrideAccess: true` allows the server component to query uncommitted draft records without having to extract user headers and re-authenticate every Local API call in the React Server Component. This is safe because identity was already validated in `/next/preview/route.ts` before draft mode was granted.

### 5.3 Zero-Cost Public Render

When `draft` is `false`, the component evaluates `{draft && <LivePreviewListener />}` to `false`. Public visitors never download or execute the live preview event listener script. Storefront pages remain purely static or statically cached server renders.

---

## 6. Client Hydration and PostMessage Protocols

Payload supports two live preview hydration mechanisms depending on whether the frontend uses React Server Components or client-side rendering.

```
+-----------------------------------------------------------------------------------------+
|                                   PAYLOAD ADMIN PANEL                                   |
|                                                                                         |
|  [ Form Inputs ] ---> on change ---> reduceFieldsToValues()                             |
|          |                                   |                                          |
|          | (autosave interval: 100ms)        |                                          |
|          v                                   v                                          |
|  Database Autosave                   window.postMessage({                               |
|          |                             type: 'payload-live-preview',                    |
|          v                             data: uncommittedFormValues                      |
|  DocumentEvents Provider             })                                                 |
|          |                                   |                                          |
|          v                                   |                                          |
|  window.postMessage({                        |                                          |
|    type: 'payload-document-event'            |                                          |
|  })                                          |                                          |
+----------|-----------------------------------|------------------------------------------+
           |                                   |
           | IFRAME BOUNDARY                   | IFRAME BOUNDARY
           v                                   v
+-----------------------------+     +-----------------------------------------------------+
|   SERVER-SIDE RSC HYDRATION |     |             CLIENT-SIDE HOOK HYDRATION              |
|                             |     |                                                     |
| RefreshRouteOnSave Listener |     | useLivePreview() / subscribe()                      |
|   |                         |     |   |                                                 |
|   v                         |     |   v                                                 |
| router.refresh()            |     | mergeData() with uncommitted incoming data          |
|   |                         |     |   |                                                 |
|   v                         |     |   v                                                 |
| Next.js fetches new RSC     |     | POST /api/:collection/:id                           |
| payload from server         |     | Header: X-Payload-HTTP-Method-Override: GET         |
|   |                         |     | Body: { data: incomingData, depth: 2 }              |
|   v                         |     |   |                                                 |
| RSC runs payload.find({     |     |   v                                                 |
|   draft: true,              |     | Payload populates uncommitted relations & uploads   |
|   overrideAccess: true      |     |   |                                                 |
| })                          |     |   v                                                 |
|   |                         |     | Client state updates via setData()                  |
|   v                         |     +-----------------------------------------------------+
| Server streams new virtual  |
| DOM back down to iframe     |
+-----------------------------+
```

### 6.1 Handshake Protocol (`ready`)

Before transmitting live updates, Payload Admin confirms that the preview target window has mounted and registered listeners.

1. When the iframe or popup loads, the client calls `ready({ serverURL })` from `@payloadcms/live-preview`:
   ```ts
   // packages/live-preview/src/ready.ts
   export const ready = (args: { serverURL: string }): void => {
     const { serverURL } = args

     if (typeof window !== 'undefined') {
       const windowToPostTo: Window = window?.opener || window?.parent

       windowToPostTo?.postMessage(
         {
           type: 'payload-live-preview',
           ready: true,
         },
         serverURL,
       )
     }
   }
   ```
2. The Admin panel (`packages/ui/src/providers/LivePreview/index.tsx`) listens for messages:
   ```ts
   const handleMessage = (event: MessageEvent) => {
     if (
       url?.startsWith(event.origin) &&
       event.data &&
       typeof event.data === 'object' &&
       event.data.type === 'payload-live-preview'
     ) {
       if (event.data.ready) {
         setAppIsReady(true)
       }
     }
   }
   ```
3. Once `appIsReady` becomes `true`, Admin enables the preview toolbar and begins broadcasting change messages.

### 6.2 Paradigm A: Server-Side RSC Hydration via `RefreshRouteOnSave`

This is the approach used by `templates/website`:

1. **Client listener component.** In `templates/website/src/components/LivePreviewListener/index.tsx`:
   ```tsx
   'use client'
   import { getClientSideURL } from '@/utilities/getURL'
   import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react'
   import { useRouter } from 'next/navigation'
   import React from 'react'

   export const LivePreviewListener: React.FC = () => {
     const router = useRouter()
     return <PayloadLivePreview refresh={router.refresh} serverURL={getClientSideURL()} />
   }
   ```
2. **Document event detection.** In `packages/live-preview-react/src/RefreshRouteOnSave.tsx`:
   ```tsx
   const onMessage = useCallback(
     (event: MessageEvent) => {
       if (isDocumentEvent(event, serverURL)) {
         if (typeof refresh === 'function') {
           refresh()
         }
       }
     },
     [refresh, serverURL],
   )
   ```
   `isDocumentEvent` checks:
   ```ts
   export const isDocumentEvent = (event: MessageEvent, serverURL: string): boolean =>
     event.origin === serverURL &&
     event.data &&
     typeof event.data === 'object' &&
     event.data.type === 'payload-document-event'
   ```
3. **Execution cycle:**
   - The editor modifies a field in Admin.
   - After 100 milliseconds, autosave persists the draft to the database.
   - Admin dispatches `{ type: 'payload-document-event' }`.
   - `RefreshRouteOnSave` intercepts the event and executes `router.refresh()`.
   - Next.js re-runs the React Server Component tree on the server.
   - The server executes `payload.find({ draft: true, overrideAccess: true })`, fetching the newly saved draft record.
   - Next.js streams the updated RSC virtual DOM payload to the browser. Next.js reconciles the DOM in place without losing client scroll position or resetting unmodified client state.

### 6.3 Paradigm B: Client-Side Hydration via `useLivePreview`

When a project renders pages using React client components (`'use client'`) rather than React Server Components, it uses `useLivePreview`:

```tsx
'use client'
import { useLivePreview } from '@payloadcms/live-preview-react'
import type { Page as PageType } from '@/payload-types'

export const PageClient: React.FC<{ initialPage: PageType }> = ({ initialPage }) => {
  const { data, isLoading } = useLivePreview<PageType>({
    initialData: initialPage,
    serverURL: 'http://localhost:3000',
    depth: 2,
  })

  return <h1>{data.title}</h1>
}
```

How `useLivePreview` synchronizes uncommitted data:

1. **Admin form broadcast.** On every keystroke, Admin executes `reduceFieldsToValues(formState, true)` and posts:
   ```ts
   {
     type: 'payload-live-preview',
     collectionSlug: 'pages',
     data: uncommittedValues,
     externallyUpdatedRelationship: mostRecentUpdate,
     locale: 'en',
   }
   ```
2. **Client subscriber.** In `packages/live-preview/src/subscribe.ts`, the hook registers `handleMessage`, which delegates to `mergeData`.
3. **Uncommitted relationship population.** Unsaved form data contains only raw relation IDs (for example, `hero.media: '60c72b2f...'`), not populated objects. To render images and related posts correctly without saving to the database, `mergeData.ts` sends a POST request with method override to Payload's REST API:
   ```ts
   const url = `${serverURL}${apiPath}/${endpoint}`

   return fetch(url, {
     body: JSON.stringify({
       data: incomingData,
       depth,
       flattenLocales: false,
       locale,
     }),
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json',
       'X-Payload-HTTP-Method-Override': 'GET',
     },
     method: 'POST',
   })
   ```
4. **Server method override handling.** In `packages/payload/src/utilities/handleEndpoints.ts`, Payload checks for `X-Payload-HTTP-Method-Override: GET`. It reads the uncommitted JSON body attached to `req.data`, runs the collection's population hooks at the requested depth, and returns the fully populated document.
5. **Compounding state cache.** In `handleMessage.ts`, the merged result caches in `_payloadLivePreview.previousData` so subsequent field changes compound over top of previously populated relationships without flickering.

---

## 7. Direct Comparison of Live Preview Architectures

| Characteristic | Server-Side Live Preview (`RefreshRouteOnSave`) | Client-Side Live Preview (`useLivePreview`) |
| :--- | :--- | :--- |
| **Component Model** | Pure React Server Components (`async function Page`) | React Client Components (`'use client'`) |
| **Primary Source Reference** | `templates/website/src/app/(frontend)/[slug]/page.tsx` | `packages/live-preview-react/src/useLivePreview.ts` |
| **Triggering Message** | `{ type: 'payload-document-event' }` | `{ type: 'payload-live-preview' }` |
| **Admin Trigger** | Document save or autosave (`interval: 100`) | Form input change (`reduceFieldsToValues`) |
| **Update Latency** | Autosave debounce + server roundtrip (~150-250ms) | Immediate keystroke update (~10-50ms) |
| **Relationship Population** | Handled natively by Local API during RSC fetch | Handled via REST `X-Payload-HTTP-Method-Override: GET` |
| **Client Bundle Size** | Minimal (~1KB listener script, rendered only in draft mode) | Medium (full page rendering code bundled for client) |
| **Lexical Rich Text Rendering** | Pure server-side HTML conversion | Client-side rich text components required |
| **Next.js Draft Mode** | Required (`draftMode().enable()`) | Optional (can query public API or mock initial data) |

---

## 8. Strategic Applications for Omset Digital

Omset Digital's architecture relies on pure React Server Components for storefront sections, isolated leaf client components for interactive elements, and multi-tenant store scoping.

1. **Adopting the RSC Pattern.** Storefront pages in `apps/app/src/app/(storefront)` should adopt the `templates/website` server-side live preview pattern. Storefront sections remain pure server components without shipping section rendering logic or Lexical parser bundles to the buyer's browser.
2. **Tenant-Aware Preview Paths.** When configuring `admin.livePreview.url` on store-scoped collections (`products`, `pages`, `themes`), the URL generator must incorporate the store's domain or slug:
   ```ts
   admin: {
     livePreview: {
       url: ({ data, req }) => {
         const storeSlug = data?.store?.slug || req.user?.lastActiveStore?.slug
         return `/next/preview?path=/${storeSlug}/${data.slug}&previewSecret=${process.env.PREVIEW_SECRET}`
       },
     },
   }
   ```
3. **Draft Mode with Store Isolation.** The `/next/preview/route.ts` authentication gate must verify that the authenticated Payload user has access to the target store using `canWrite` or store membership checks before enabling Next.js draft mode.
4. **Hybrid Theme Token Synchronization.** While content and layout blocks update via RSC `router.refresh()`, design token adjustments (CSS variables like `--theme-primary` or `--theme-font`) can continue using the client-side `subscribeThemeLivePreview` engine in `@repo/payload-plugin-themes/client` to update inline CSS variables instantaneously without incurring full route refreshes.
