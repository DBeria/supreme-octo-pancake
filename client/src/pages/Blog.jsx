import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Tiny neutral placeholder (base64 SVG) used if a photo fails to load */
const FALLBACK_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%23e2e8f0" offset="0"/><stop stop-color="%23cbd5e1" offset="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/><g font-family="Arial" font-size="36" fill="%2360748b" opacity="0.7"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">POCUS World</text></g></svg>';

/** Reusable image with lazy loading, responsive srcSet, blur-in, and fallback */
const SafeImage = ({ src, alt, className }) => {
  const [ok, setOk] = React.useState(true);
  return (
    <img
      src={ok ? src : FALLBACK_DATA_URI}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`transition-transform duration-300 ${className}`}
      onError={() => setOk(false)}
      srcSet={
        ok
          ? `${src}&w=600 600w, ${src}&w=900 900w, ${src}&w=1200 1200w, ${src}&w=1600 1600w`
          : undefined
      }
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
    />
  );
};

// Curated, on-topic images (Unsplash IDs are stable)
const blogPosts = [
  {
    slug: 'online-pocus-courses',
    title: 'Your Guide to Our Comprehensive Online POCUS Courses',
    author: 'Dr. John Doe',
    date: 'September 5, 2025',
    excerpt:
      'Explore our full range of courses, from Cardiac and Lung Ultrasound to Regional Anesthesia and Vascular Access. Our expert-led training is designed to build your skills from the ground up.',
    // Ultrasound education / console teaching
    imageUrl:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop',
    imageAlt: 'Clinician teaching ultrasound at bedside with an ultrasound console',
    featured: true,
    content: `
      <p class="mb-4 text-lg">Welcome to POCUS World, where we believe in empowering medical professionals with the skills of point-of-care ultrasound. Our platform offers a diverse range of courses designed to meet the needs of clinicians at every stage of their career.</p>
      <h3 class="text-2xl font-bold mt-8 mb-3">Our Core Offerings</h3>
      <p class="mb-4">Our <strong>Online Cardiac Ultrasound Courses</strong> dive deep into the heart of POCUS, teaching you how to perform a Focused Assessment with Transthoracic Echocardiography (FATE) to rapidly evaluate cardiac function and hemodynamics.</p>
      <p class="mb-4">With our <strong>Online Lung Ultrasound Courses</strong>, you'll learn to diagnose common respiratory conditions like pneumothorax, pulmonary edema, and pleural effusions.</p>
      <p class="mb-4">Our <strong>Regional Anesthesia & Nerve Block</strong> and <strong>Vascular Access</strong> e-courses focus on procedural skills with ultrasound guidance.</p>
      <p class="mb-4">Additionally, our <strong>FAST, Airway and Gastric POCUS Training Courses</strong> provide a robust foundation for emergency medicine.</p>
      <h3 class="text-2xl font-bold mt-8 mb-3">Why Choose POCUS World?</h3>
      <p class="mb-4">We are committed to high-quality, accessible education that translates directly to clinical practice.</p>
      <p class="mt-8 font-semibold">Ready to get started? Visit our <a href="/courses" class="text-blue-500 hover:underline">Course Catalog</a> to find the perfect course for you.</p>
    `,
  },
  {
    slug: 'a-day-in-the-life-with-fate',
    title: 'From Theory to Practice: A Day in the Life with FATE',
    author: 'Dr. Kenji Tanaka',
    date: 'August 22, 2025',
    excerpt:
      'How does the Basic Focused Cardiac Ultrasound (FATE) protocol translate to real-world clinical scenarios? Follow along as we break down a typical day in the ICU, applying FATE to assess IVC, estimate pressure, and guide treatment decisions.',
    // Cardiac/ICU bedside ultrasound vibe
    imageUrl:
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop',
    imageAlt: 'ICU monitor and clinician performing bedside cardiac ultrasound',
    featured: false,
  },
  {
    slug: 'ultrasound-in-the-er',
    title: 'Ultrasound in the ER: How Essential Emergency Ultrasound Saves Lives',
    author: 'Dr. Maria Flores',
    date: 'August 15, 2025',
    excerpt:
      'In the fast-paced environment of the emergency room, quick and accurate diagnostics are paramount. Learn how the Essential Emergency Ultrasound Course provides the skills to rapidly assess patients and make life-saving interventions.',
    // Emergency department environment
    imageUrl:
      'https://images.unsplash.com/photo-1584785930844-b74e0c3c2b0f?auto=format&fit=crop',
    imageAlt: 'Emergency department team using bedside ultrasound during patient care',
    featured: false,
  },
];

const FeaturedPostCard = ({ post }) => (
  <div className="group grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
    <div className="overflow-hidden rounded-xl">
      <SafeImage
        src={post.imageUrl}
        alt={post.imageAlt || post.title}
        className="w-full h-full object-cover group-hover:scale-105"
      />
    </div>
    <div>
      <p className="text-sm text-blue-500 font-semibold mb-2">
        {post.author} • {post.date}
      </p>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {post.title}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{post.excerpt}</p>
      <Link
        to={`/blog/${post.slug}`}
        className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300"
      >
        Read Full Article
        <ChevronRight
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1"
          size={20}
        />
      </Link>
    </div>
  </div>
);

const PostCard = ({ post }) => (
  <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
    <div className="overflow-hidden">
      <SafeImage
        src={post.imageUrl}
        alt={post.imageAlt || post.title}
        className="w-full h-48 object-cover group-hover:scale-105"
      />
    </div>
    <div className="p-6">
      <p className="text-sm text-blue-500 font-semibold mb-2">
        {post.author} • {post.date}
      </p>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        {post.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
        {post.excerpt}
      </p>
      <Link
        to={`/blog/${post.slug}`}
        className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300"
      >
        Read More
        <ChevronRight
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1"
          size={16}
        />
      </Link>
    </div>
  </div>
);

const Blog = () => {
  const featuredPost = blogPosts.find((p) => p.featured);
  const otherPosts = blogPosts.filter((p) => !p.featured);

  return (
    <div className="bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white">
            The POCUS World Blog
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Insights, techniques, and stories from the world of point-of-care ultrasound.
          </p>
        </div>

        {featuredPost && (
          <section className="mb-16">
            <FeaturedPostCard post={featuredPost} />
          </section>
        )}

        <section>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {otherPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Blog;
