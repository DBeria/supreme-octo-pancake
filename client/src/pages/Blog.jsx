import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';

// This would typically come from a CMS or API
const blogPosts = [
    {
        slug: 'online-pocus-courses',
        title: 'Your Guide to Our Comprehensive Online POCUS Courses',
        author: 'Dr. John Doe',
        date: 'September 5, 2025',
        excerpt: 'Explore our full range of courses, from Cardiac and Lung Ultrasound to Regional Anesthesia and Vascular Access. Our expert-led training is designed to build your skills from the ground up.',
        imageUrl: 'https://images.unsplash.com/photo-1596541223130-5d31a73f73ae?q=80&w=2070&auto=format&fit=crop',
        featured: true,
        // Detailed content for this post is now included
        content: `
            <p class="mb-4 text-lg">Welcome to POCUS World, where we believe in empowering medical professionals with the skills of point-of-care ultrasound. Our platform offers a diverse range of courses designed to meet the needs of clinicians at every stage of their career.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">Our Core Offerings</h3>
            <p class="mb-4">Our **Online Cardiac Ultrasound Courses** dive deep into the heart of POCUS, teaching you how to perform a Focused Assessment with Transthoracic Echocardiography (FATE) to rapidly evaluate cardiac function and hemodynamics. You'll master key views and protocols to confidently assess everything from pericardial effusions to global contractility at the bedside.</p>
            <p class="mb-4">With our **Online Lung Ultrasound Courses**, you'll learn to diagnose common respiratory conditions like pneumothorax, pulmonary edema, and pleural effusions. This non-invasive technique is a game-changer in the emergency room and intensive care unit, and our course provides the practical skills you need to apply it immediately.</p>
            <p class="mb-4">Our **Regional Anesthesia & Nerve Block e-Courses** and **Vascular Access e-Courses** focus on procedural skills. You'll gain the anatomical knowledge and technical proficiency to perform ultrasound-guided nerve blocks for pain management and to achieve reliable vascular access, reducing complications and improving patient safety.</p>
            <p class="mb-4">Additionally, our **FAST, Airway and Gastric POCUS Training Courses** provide a robust foundation for emergency medicine. Learn to perform the FAST exam for trauma, assess the airway for difficult intubations, and evaluate gastric contents to minimize aspiration risk.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">Why Choose POCUS World?</h3>
            <p class="mb-4">We are committed to providing high-quality, accessible education that translates directly to clinical practice. Our courses are developed by experts and are designed to make you a more confident and capable practitioner. Whether you're a student, resident, or attending physician, our courses will help you integrate POCUS into your daily workflow and enhance patient care.</p>
            <p class="mt-8 font-semibold">Ready to get started? Visit our <a href="/courses" class="text-blue-500 hover:underline">Course Catalog</a> to find the perfect course for you.</p>
        `,
    },
    {
        slug: 'a-day-in-the-life-with-fate',
        title: 'From Theory to Practice: A Day in the Life with FATE',
        author: 'Dr. Kenji Tanaka',
        date: 'August 22, 2025',
        excerpt: 'How does the Basic Focused Cardiac Ultrasound (FATE) protocol translate to real-world clinical scenarios? Follow along as we break down a typical day in the ICU, applying FATE to assess IVC, estimate pressure, and guide treatment decisions.',
        imageUrl: 'https://images.unsplash.com/photo-1551193583-99a9b0c5a47e?q=80&w=2070&auto=format&fit=crop',
        featured: false,
    },
    {
        slug: 'ultrasound-in-the-er',
        title: 'Ultrasound in the ER: How Essential Emergency Ultrasound Saves Lives',
        author: 'Dr. Maria Flores',
        date: 'August 15, 2025',
        excerpt: 'In the fast-paced environment of the emergency room, quick and accurate diagnostics are paramount. Learn how the Essential Emergency Ultrasound Course provides the skills to rapidly assess patients and make life-saving interventions.',
        imageUrl: 'https://images.unsplash.com/photo-1628334882277-3523c533f85a?q=80&w=1974&auto=format&fit=crop',
        featured: false,
    }
];

const FeaturedPostCard = ({ post }) => (
    <div className="group grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="overflow-hidden rounded-xl">
            <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div>
            <p className="text-sm text-blue-500 font-semibold mb-2">{post.author} • {post.date}</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{post.excerpt}</p>
            <Link to={`/blog/${post.slug}`} className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">
                Read Full Article
                <ChevronRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" size={20} />
            </Link>
        </div>
    </div>
);

const PostCard = ({ post }) => (
    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-hidden">
            <img src={post.imageUrl} alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="p-6">
            <p className="text-sm text-blue-500 font-semibold mb-2">{post.author} • {post.date}</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{post.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
            <Link to={`/blog/${post.slug}`} className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">
                Read More
                <ChevronRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" size={16} />
            </Link>
        </div>
    </div>
);

const Blog = () => {
    const featuredPost = blogPosts.find(p => p.featured);
    const otherPosts = blogPosts.filter(p => !p.featured);

    return (
        <div className="bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white">The POCUS World Blog</h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Insights, techniques, and stories from the world of point-of-care ultrasound.</p>
                </div>

                {featuredPost && (
                    <section className="mb-16">
                        <FeaturedPostCard post={featuredPost} />
                    </section>
                )}

                <section>
                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
                        {otherPosts.map(post => (
                            <PostCard key={post.slug} post={post} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Blog;