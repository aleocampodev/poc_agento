import type { Media as MediaType, GalleryBlock as GalleryBlockType } from '@/payload-types'
import { GalleryClient, type GalleryTabItem, type GalleryImageItem } from './GalleryClient'

export type GalleryBlockProps = GalleryBlockType & {
  id?: string
}

// Fotografías auténticas organizadas por categorías temáticas de Nenúfar
const CLIENTAS_IMAGES: GalleryImageItem[] = [
  {
    id: 'clienta-1',
    title: 'Okama Ceremonial en Lino',
    src: '/media/Embera-800x1000.webp',
    alt: 'Clienta de Nenúfar luciendo collar Okama en Cartagena',
    isFeatured: true,
  },
  {
    id: 'clienta-2',
    title: 'Aretes Tricolor en Celebración',
    src: '/media/colombia-aretes-800x1000.webp',
    alt: 'Clienta luciendo aretes artesanales tricolor de Nenúfar',
  },
  {
    id: 'clienta-3',
    title: 'Joya de Autor en la Piel',
    src: '/media/joya-1788320703397-800x1000.webp',
    alt: 'Clienta con pieza exclusiva de Shirley - Nenúfar',
  },
  {
    id: 'clienta-4',
    title: 'Aretes Inspiración Café',
    src: '/media/cafe-aretes-1-800x1000.webp',
    alt: 'Clienta con aretes de café Nenúfar',
  },
  {
    id: 'clienta-5',
    title: 'Candongas de Mostacilla Calibrada',
    src: '/media/colombia-aretes-2-800x1000.webp',
    alt: 'Clienta con candongas Nenúfar',
  },
  {
    id: 'clienta-6',
    title: 'Collar Colibrí en Ocasión Especial',
    src: '/media/colibri-1-800x1000.webp',
    alt: 'Clienta con collar de colibrí Nenúfar',
  },
  {
    id: 'clienta-7',
    title: 'Diseño Ancestral en Celebración',
    src: '/media/joya-1788320381292-800x1000.webp',
    alt: 'Aretes de autor en clienta Nenúfar',
  },
]

const FERIAS_IMAGES: GalleryImageItem[] = [
  {
    id: 'feria-1',
    title: 'Muestra en Feria de Diseño',
    src: '/media/landing-1-800x1000.webp',
    alt: 'Puesto de Nénufar en feria de diseño de Cartagena',
    isFeatured: true,
  },
  {
    id: 'feria-2',
    title: 'Shirley Compartiendo su Oficio',
    src: '/media/shirley-nenufar-1-800x1000.webp',
    alt: 'Shirley en feria artesanal en Cartagena',
  },
  {
    id: 'feria-3',
    title: 'Muestra de Piezas en Vivo',
    src: '/media/joya-1788385407531-800x1000.webp',
    alt: 'Muestra de joyas en mostacilla en feria local',
  },
  {
    id: 'feria-4',
    title: 'Pop-Up en el Centro Histórico',
    src: '/media/WhatsApp%20Image%202026-07-29%20at%2011.35.53%20PM-1-800x1000.webp',
    alt: 'Exhibición Pop-Up en Cartagena',
  },
  {
    id: 'feria-5',
    title: 'Exhibición de Collares y Aretes',
    src: '/media/image-landing1-800x1000.webp',
    alt: 'Exhibición de piezas en feria',
  },
  {
    id: 'feria-6',
    title: 'Encuentro con Amantes del Arte Textil',
    src: '/media/landing-800x1000.webp',
    alt: 'Feria de diseño independiente',
  },
]

const PREMIOS_IMAGES: GalleryImageItem[] = [
  {
    id: 'premio-1',
    title: 'Reconocimiento Artesanía Colombiana',
    src: '/media/shirley-creadora-800x1000.webp',
    alt: 'Shirley recibiendo reconocimiento por su labor artesanal',
    isFeatured: true,
  },
  {
    id: 'premio-2',
    title: 'Mención Especial Diseño Contemporáneo',
    src: '/media/Embera-800x1000.webp',
    alt: 'Pieza galardonada en concurso de diseño',
  },
  {
    id: 'premio-3',
    title: 'Premio Innovación en Técnica Ancestral',
    src: '/media/colombia-aretes-800x1000.webp',
    alt: 'Reconocimiento a la innovación en tejido de mostacilla',
  },
]

const SHIRLEY_IMAGES: GalleryImageItem[] = [
  {
    id: 'shirley-1',
    title: 'Shirley en su Espacio Creador',
    src: '/media/shirley-creadora-800x1000.webp',
    alt: 'Shirley tejiendo joyería artesanal en su taller de Cartagena',
    isFeatured: true,
  },
  {
    id: 'shirley-2',
    title: 'Prototipos y Flores Tejidas',
    src: '/media/Collar-flor-800x1000.webp',
    alt: 'Creación botánica en mostacilla en el taller de Shirley',
  },
  {
    id: 'shirley-3',
    title: 'Selección de Micro-Mostacillas',
    src: '/media/shirley-nenufar-800x1000.webp',
    alt: 'Shirley seleccionando mostacillas en su taller',
  },
  {
    id: 'shirley-4',
    title: 'Diseño Floral Caribeño',
    src: '/media/pinas-800x1000.webp',
    alt: 'Aretes de piña y flores',
  },
  {
    id: 'shirley-5',
    title: 'Colibrí Tejido a Mano',
    src: '/media/colibri-800x1000.webp',
    alt: 'Colibrí artesanal en mostacilla',
  },
  {
    id: 'shirley-6',
    title: 'Mesa de Hilado y Texturas',
    src: '/media/aretas-cafe-800x1000.webp',
    alt: 'Mesa de hilado en taller de Shirley',
  },
]

// Todas las fotos combinadas para la pestaña general
const ALL_IMAGES: GalleryImageItem[] = [
  ...CLIENTAS_IMAGES,
  ...FERIAS_IMAGES,
  ...PREMIOS_IMAGES,
  ...SHIRLEY_IMAGES,
]

const DEFAULT_GALLERY_TABS: GalleryTabItem[] = [
  {
    tabTitle: 'Todas las Fotos',
    tabSubtitle: 'Colección visual completa de Nénufar',
    images: ALL_IMAGES,
  },
  {
    tabTitle: 'Nuestras Clientas',
    tabSubtitle: 'Mujeres reales vistiendo cada diseño',
    images: CLIENTAS_IMAGES,
  },
  {
    tabTitle: 'Ferias en Cartagena',
    tabSubtitle: 'Encuentros presenciales y pop-ups',
    images: FERIAS_IMAGES,
  },
  {
    tabTitle: 'Mis Premios',
    tabSubtitle: 'Reconocimientos y logros',
    images: PREMIOS_IMAGES,
  },
  {
    tabTitle: 'El Taller & Shirley',
    tabSubtitle: 'El espacio íntimo de creación en Getsemaní',
    images: SHIRLEY_IMAGES,
  },
]

function resolveImageUrl(imageField?: number | string | MediaType | null, fallbackUrl?: string | null): string {
  if (imageField && typeof imageField === 'object') {
    const media = imageField as MediaType
    const url = media.url || (media as any).sizes?.card?.url || (media as any).sizes?.thumbnail?.url
    if (url) return url
  }
  if (typeof imageField === 'string' && imageField.trim().length > 0) {
    return imageField
  }
  if (fallbackUrl && fallbackUrl.trim().length > 0) {
    return fallbackUrl
  }
  return '/media/Embera-800x1000.webp'
}

export const GalleryBlock: React.FC<GalleryBlockProps> = ({
  tagline,
  heading,
  description,
  tabs,
  id,
}) => {
  // Procesar las pestañas recibidas de Payload o usar el catálogo enriquecido por defecto
  let processedTabs: GalleryTabItem[] = DEFAULT_GALLERY_TABS

  if (tabs && Array.isArray(tabs) && tabs.length > 0) {
    const parsedTabs: GalleryTabItem[] = tabs.map((tab, tIdx) => {
      const fallbackTab = DEFAULT_GALLERY_TABS[(tIdx + 1) % DEFAULT_GALLERY_TABS.length]
      const tabImages: GalleryImageItem[] =
        tab.images && Array.isArray(tab.images) && tab.images.length > 0
          ? tab.images.map((img, iIdx) => {
              const src = resolveImageUrl(img.image, img.imageUrl)
              return {
                id: img.id || `${tIdx}-${iIdx}`,
                title: img.title || `Pieza ${iIdx + 1}`,
                category: img.category || tab.tabTitle,
                description: img.description || undefined,
                src,
                alt: img.title || 'Joyería artesanal Nenúfar',
                isFeatured: Boolean(img.isFeatured),
              }
            })
          : fallbackTab.images

      return {
        tabTitle: tab.tabTitle || fallbackTab.tabTitle,
        tabSubtitle: tab.tabSubtitle || fallbackTab.tabSubtitle,
        images: tabImages,
      }
    })

    const hasAllTab = parsedTabs.some((t) => t.tabTitle?.toLowerCase().includes('todas'))
    const allCombined = parsedTabs.flatMap((t) => t.images)

    processedTabs = hasAllTab
      ? parsedTabs
      : [
          {
            tabTitle: 'Todas las Fotos',
            tabSubtitle: 'Colección visual completa de Nenúfar',
            images: allCombined,
          },
          ...parsedTabs,
        ]
  }

  return (
    <GalleryClient
      tagline={tagline ?? null}
      heading={heading ?? null}
      description={description ?? null}
      tabs={processedTabs}
      id={id || 'galeria'}
    />
  )
}
