export const site = {
  name: 'JR Design Build',
  legalName: 'JR Design Build, Inc.',
  tagline: 'Architectural Design & Construction',
  description:
    'A CSLB licensed design-build firm in Los Angeles crafting luxury custom homes, whole-home remodels, and ADUs — from first sketch to final reveal.',
  url: 'https://www.jrdesignbuild.com',
  email: 'studio@jrdesignbuild.com',
  phone: '+1 (323) 555-0182',
  phoneHref: 'tel:+13235550182',
  address: {
    street: '8675 Wilshire Blvd, Suite 400',
    city: 'Los Angeles',
    region: 'CA',
    postalCode: '90211',
    country: 'US',
  },
  geo: { lat: 34.0668, lng: -118.3815 },
  license: 'CSLB License #1098432',
  hours: 'Mon–Fri 9:00am – 6:00pm',
  areaServed: [
    'Los Angeles',
    'Beverly Hills',
    'Bel Air',
    'Santa Monica',
    'Pasadena',
    'Malibu',
  ],
  social: {
    instagram: 'https://instagram.com/jrdesignbuild',
    houzz: 'https://houzz.com/pro/jrdesignbuild',
    linkedin: 'https://linkedin.com/company/jrdesignbuild',
  },
}

export type NavItem = { label: string; to: string }

export const nav: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export type Service = {
  title: string
  blurb: string
  details: string[]
}

export const services: Service[] = [
  {
    title: 'Custom Homes',
    blurb:
      'Ground-up residences designed and built under one roof — architecture, interiors, and construction in seamless sequence.',
    details: [
      'Architectural design & permitting',
      'Structural & MEP engineering coordination',
      'Bespoke millwork and finish carpentry',
      'Smart-home & lighting integration',
    ],
  },
  {
    title: 'Whole-Home Remodels',
    blurb:
      'Comprehensive transformations that respect the bones of a home while reimagining how it lives.',
    details: [
      'Kitchen & bath renewal',
      'Structural reconfiguration & additions',
      'Indoor–outdoor living connections',
      'Historic & estate restoration',
    ],
  },
  {
    title: 'ADUs & Additions',
    blurb:
      'Accessory dwelling units and second stories engineered to add value, space, and rental potential.',
    details: [
      'Detached & attached ADUs',
      'Garage conversions',
      'Second-story additions',
      'Streamlined LADBS approvals',
    ],
  },
  {
    title: 'Design Studio',
    blurb:
      'In-house architectural and interior design so the vision never gets lost in translation.',
    details: [
      'Concept & schematic design',
      'Material & finish curation',
      '3D visualization & Matterport tours',
      'Furniture, fixtures & equipment',
    ],
  },
]

export type Project = {
  title: string
  location: string
  category: string
  year: string
  scope: string
  accent: string
}

export const projects: Project[] = [
  {
    title: 'Mulholland Modern',
    location: 'Bel Air, CA',
    category: 'Custom Home',
    year: '2025',
    scope: '6,800 sq ft new construction with infinity edge pool',
    accent: 'from-[#1c1c1c] to-[#2a2418]',
  },
  {
    title: 'The Canyon Residence',
    location: 'Beverly Hills, CA',
    category: 'Whole-Home Remodel',
    year: '2024',
    scope: 'Full gut renovation & 1,200 sq ft addition',
    accent: 'from-[#191919] to-[#241f15]',
  },
  {
    title: 'Palisades Glass House',
    location: 'Pacific Palisades, CA',
    category: 'Custom Home',
    year: '2024',
    scope: 'Steel & glass pavilion with ocean views',
    accent: 'from-[#1b1b1b] to-[#22231a]',
  },
  {
    title: 'Studio City ADU',
    location: 'Studio City, CA',
    category: 'ADU',
    year: '2025',
    scope: '950 sq ft detached guest house & studio',
    accent: 'from-[#181818] to-[#26211a]',
  },
  {
    title: 'Brentwood Estate',
    location: 'Brentwood, CA',
    category: 'Restoration',
    year: '2023',
    scope: 'Spanish revival restoration & modern wing',
    accent: 'from-[#1a1a1a] to-[#231d14]',
  },
  {
    title: 'Malibu Cliffside',
    location: 'Malibu, CA',
    category: 'Custom Home',
    year: '2025',
    scope: 'Cantilevered 5,400 sq ft coastal residence',
    accent: 'from-[#171717] to-[#221e16]',
  },
]

export type Stat = { value: string; label: string }

export const stats: Stat[] = [
  { value: '20+', label: 'Years Building in LA' },
  { value: '180+', label: 'Homes Delivered' },
  { value: '$400M+', label: 'In Construction Value' },
  { value: '100%', label: 'CSLB Licensed & Insured' },
]

export type Step = { n: string; title: string; body: string }

export const process: Step[] = [
  {
    n: '01',
    title: 'Discovery',
    body: 'We listen to how you live and translate it into a brief — budget, timeline, and architectural intent aligned from day one.',
  },
  {
    n: '02',
    title: 'Design',
    body: 'Our in-house studio develops architecture and interiors together, validated with 3D visualization and Matterport walkthroughs.',
  },
  {
    n: '03',
    title: 'Pre-Construction',
    body: 'Transparent estimating, value engineering, permitting, and a locked schedule before a single wall is framed.',
  },
  {
    n: '04',
    title: 'Build',
    body: 'A dedicated project lead, weekly reporting, and meticulous craftsmanship from foundation to the final reveal.',
  },
]
