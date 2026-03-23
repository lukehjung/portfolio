'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#3c3c3c] font-sans selection:bg-[#eaddca] selection:text-[#5d4037] overflow-x-hidden">
      
      {/* Soft Serif Font Import */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');
        
        h1, h2, h3 {
          font-family: 'Merriweather', serif;
        }
        
        body {
          font-family: 'Inter', sans-serif;
        }

        @keyframes subtle-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-subtle {
          animation: subtle-fade 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Subtle Warm Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#f5ebe0] rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#edede9] rounded-full blur-[100px] opacity-50"></div>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-8 py-20 md:py-32">
        
        {/* Minimal Header */}
        <header className="flex justify-between items-center mb-32 animate-subtle" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-[#5d4037]">LJ.</span>
          </div>
          <nav className="flex items-center gap-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d8d8d]">
            <Link href="/resume" className="hover:text-[#5d4037] transition-colors">Resume</Link>
            <Link href="/esports" className="hover:text-[#5d4037] transition-colors">Esports</Link>
            <Link href="/tft" className="hover:text-[#5d4037] transition-colors">TFT</Link>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="mb-40 max-w-3xl animate-subtle" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-5xl md:text-7xl font-black leading-tight text-[#2d2d2d] mb-8">
            Building software with <span className="italic font-light text-[#8d8d8d]">intention</span> and care.
          </h1>
          
          <div className="space-y-6 text-lg md:text-xl text-[#6b6b6b] font-light leading-relaxed">
            <p>
              I&apos;m <span className="text-[#5d4037] font-medium italic">Luke H. Jung</span>. Currently a Software Development Engineer II at Amazon Prime Video, focused on building the digital infrastructure that delivers live experiences to millions.
            </p>
            <p>
              I believe in clean architecture, high-fidelity design, and the quiet power of well-crafted tools.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-8">
            <a 
              href="/files/Luke-Jung-Resume.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-bold uppercase tracking-widest text-[#5d4037] border-b-2 border-[#5d4037]/20 hover:border-[#5d4037] transition-all pb-1"
            >
              View Resume (PDF)
            </a>
            <div className="flex gap-4">
               <a href="https://linkedin.com/in/lukehjung" target="_blank" rel="noopener noreferrer" className="text-[#8d8d8d] hover:text-[#5d4037] transition-colors underline underline-offset-4 decoration-1 decoration-[#8d8d8d]/30">LinkedIn</a>
               <a href="https://github.com/lukehjung" target="_blank" rel="noopener noreferrer" className="text-[#8d8d8d] hover:text-[#5d4037] transition-colors underline underline-offset-4 decoration-1 decoration-[#8d8d8d]/30">GitHub</a>
            </div>
          </div>
        </section>

        {/* Subtle Navigation Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24 animate-subtle" style={{ animationDelay: '0.6s' }}>
          
          {/* Resume Card */}
          <div className="group relative min-h-[600px] p-1 rounded-sm overflow-hidden transition-all duration-700 hover:shadow-md">
            <div className="absolute inset-0 bg-[#f0ede6] transition-all duration-700"></div>
            <div className="relative h-full w-full bg-[#f0ede6] p-10 flex flex-col justify-between border border-[#edede9] group-hover:border-[#5d4037]/20 transition-all duration-700">
              <div className="space-y-8">
                <div className="aspect-[4/5] bg-[#e8e4db] overflow-hidden rounded-sm relative shadow-sm transition-shadow">
                   <img 
                    src="/images/profilePhoto.jpg" 
                    alt="Luke" 
                    className="w-full h-full object-cover opacity-90 transition-all duration-1000"
                   />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-[#2d2d2d] mb-3">Professional Resume</h3>
                   <p className="text-[#8d8d8d] font-light leading-relaxed mb-4">
                     A detailed look at 5.5 years of engineering experience across Amazon Prime Video and academic work at UCLA.
                   </p>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-6">
                <Link href="/resume" className="text-xs font-bold uppercase tracking-widest text-[#5d4037] hover:italic transition-all">
                  Explore Experience &rarr;
                </Link>
                <a 
                  href="/files/Luke-Jung-Resume.pdf" 
                  download 
                  className="text-xs font-bold uppercase tracking-widest text-[#8d8d8d] hover:text-[#5d4037] transition-all border-b border-transparent hover:border-[#5d4037]/20 pb-0.5"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </div>

          {/* Projects Container */}
          <div className="space-y-24">
            
            {/* Esports Hub */}
            <Link href="/esports" className="group block space-y-6">
              <div className="aspect-video bg-[#e8e4db] rounded-sm p-8 flex items-center justify-center relative overflow-hidden group-hover:bg-[#dfdad0] transition-colors">
                 <div className="text-[#5d4037]/20 text-7xl font-black italic select-none uppercase tracking-tighter">Esports</div>
                 <div className="absolute bottom-6 right-6 text-xs font-bold uppercase tracking-[0.3em] text-[#5d4037]">Dashboard</div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#2d2d2d] mb-3">Esports Hub</h3>
                <p className="text-[#8d8d8d] font-light leading-relaxed mb-4">
                  Match analysis and organizational history synthesized with AI and real-time GraphQL data.
                </p>
                <span className="text-xs font-bold uppercase tracking-widest text-[#5d4037] group-hover:italic transition-all">View Dashboard &rarr;</span>
              </div>
            </Link>

            {/* TFT Stats */}
            <Link href="/tft" className="group block space-y-6">
              <div className="aspect-video bg-[#edede9] rounded-sm p-8 flex items-center justify-center relative overflow-hidden group-hover:bg-[#e3e3dd] transition-colors">
                 <div className="text-[#5d4037]/20 text-7xl font-black italic select-none uppercase tracking-tighter">Mastery</div>
                 <div className="absolute bottom-6 right-6 text-xs font-bold uppercase tracking-[0.3em] text-[#5d4037]">Tactics</div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#2d2d2d] mb-3">TFT Analytics</h3>
                <p className="text-[#8d8d8d] font-light leading-relaxed mb-4">
                  Real-time Riot ID verification and rank progression tracking at the network edge.
                </p>
                <span className="text-xs font-bold uppercase tracking-widest text-[#5d4037] group-hover:italic transition-all">Track Rank &rarr;</span>
              </div>
            </Link>

          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="mt-48 pt-12 border-t border-[#edede9] flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b0b0b0] italic">
          <div>Built by Luke H. Jung &copy; {new Date().getFullYear()}</div>
          <div className="flex gap-12">
             <span>Seattle, Washington</span>
             <span>Intention &bull; Design &bull; Scale</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
