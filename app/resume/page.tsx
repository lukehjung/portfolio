import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume | Luke H. Jung',
  description: 'Professional resume of Luke H. Jung, Software Engineer.',
};

export default function ResumePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <main className="w-full lg:w-2/3 max-w-7xl mx-auto bg-white text-gray-900 shadow-2xl rounded-2xl overflow-hidden relative border border-gray-200">
        {/* Decorative Top Banner */}
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400"></div>

        <div className="p-6 sm:p-10 md:p-14">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between border-b border-gray-200 pb-8 mb-8 gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Image - Using a placeholder! Swap the src to your actual photo */}
              <div className="relative">
                <img
                  src="/images/profilePhoto.jpg"
                  alt="Luke Jung"
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full shadow-lg border-4 border-white object-cover"
                />
                <span className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white rounded-full" title="Available for work"></span>
              </div>
              
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-2">
                  LUKE H. JUNG
                </h1>
                <h2 className="text-xl md:text-2xl font-medium text-blue-600 mb-4">
                  Software Development Engineer II
                </h2>
                
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-5 text-base text-gray-600 font-medium">
                  <a href="mailto:lukethejung@gmail.com" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <i className="fa fa-envelope text-gray-400"></i> lukethejung@gmail.com
                  </a>
                  <a href="tel:8583426779" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <i className="fa fa-phone text-gray-400"></i> (858) 342-6779
                  </a>
                  <a href="http://lukehjung.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <i className="fa fa-globe text-gray-400"></i> lukehjung.com
                  </a>
                  <span className="flex items-center gap-1.5">
                    <i className="fa fa-map-marker text-gray-400"></i> Seattle, WA
                  </span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              <a href="https://github.com/lukehjung" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-all shadow-sm">
                <i className="fa fa-github text-xl"></i>
              </a>
              <a href="https://linkedin.com/in/lukehjung" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-all shadow-sm">
                <i className="fa fa-linkedin text-xl"></i>
              </a>
            </div>
          </div>

          {/* Professional Summary */}
          <section className="mb-10">
            <div className="bg-gradient-to-r from-blue-50 to-blue-50/10 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm">
              <h2 className="text-lg font-bold uppercase text-blue-800 mb-2 flex items-center gap-2">
                <i className="fa fa-user-circle-o"></i> Professional Summary
              </h2>
              <p className="text-gray-700 leading-relaxed text-[15px]">
                Software Engineer with <strong className="text-gray-900">5.5 years of experience</strong> building high-scale distributed systems and global publishing platforms. Expert in <strong className="text-gray-900">Java, AWS, and Typescript</strong>, with a proven track record of leading critical security goals at <strong className="text-gray-900">Amazon</strong>, mentoring interns to full-time offers, and driving architectural consolidation for services reaching millions of global users.
              </p>
            </div>
          </section>

          {/* Professional Experience */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold uppercase border-b-2 border-gray-100 pb-3 mb-6 text-gray-800 flex items-center gap-2">
              <i className="fa fa-briefcase text-blue-500"></i> Professional Experience
            </h2>

            <div className="space-y-8">
              {/* Amazon SDE II */}
              <div className="group hover:bg-slate-50 p-4 -mx-4 rounded-xl transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200">
                      <i className="fa fa-amazon text-2xl text-gray-800"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">AMAZON: PRIME VIDEO LIVE EVENTS</h3>
                      <p className="font-medium text-blue-600">Software Development Engineer II (Live Events Publishing)</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-base font-semibold rounded-full">Dec 2023 &ndash; Present</span>
                    <p className="text-base text-gray-500 mt-1"><i className="fa fa-map-marker"></i> Seattle, WA</p>
                  </div>
                </div>
                <ul className="list-disc list-outside text-gray-600 space-y-2 ml-16 mt-4 text-[15px] marker:text-gray-300">
                  <li><strong className="text-gray-800">Security Infrastructure:</strong> Led a team-wide security initiative to modernize authentication for internal services, performing deep-dive troubleshooting on outgoing network calls to reach 100% compliance with mandated security headers.</li>
                  <li><strong className="text-gray-800">High-Scale Data Management:</strong> Designed a notification system to manage broadcast merges that handled race conditions between concurrent updates, supporting over 400 profile updates in a single workflow execution.</li>
                  <li><strong className="text-gray-800">Regional Viewing & NBA Support:</strong> Implemented &quot;Couch Rights&quot; features to allow customers to access home-market content while traveling and developed validation rules to prevent incorrect content publishing during NBA launches.</li>
                  <li><strong className="text-gray-800">Partner Onboarding & Ads:</strong> Engineered validation guardrails for the Fox partnership in under two weeks and built a system to offer tiered ad-supported or premium viewing options for League Pass subscribers.</li>
                  <li><strong className="text-gray-800">Operational Excellence:</strong> Reduced the manual ticket load for support teams by 90% by creating a new automated error-reporting dashboard that replaced outdated comment-based systems with a readable, tabular format.</li>
                  <li><strong className="text-gray-800">System Robustness:</strong> Resolved flaky integration tests and updated data classification logic to be more resilient, reducing the number of high-priority pages sent to the engineering team during peak live events.</li>
                  <li><strong className="text-gray-800">Mentorship & Hiring:</strong> Mentored engineering interns through the full project lifecycle&mdash;including project planning, code reviews, and leadership presentations&mdash;resulting in successful full-time hiring offers.</li>
                  <li><strong className="text-gray-800">Technical Leadership:</strong> Conducted 30+ technical and behavioral interviews for various engineering teams, spending time in pre-interview planning and post-interview debriefs to ensure a high hiring bar.</li>
                </ul>
              </div>

              {/* Amazon SDE I */}
              <div className="group hover:bg-slate-50 p-4 -mx-4 rounded-xl transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200">
                      <i className="fa fa-amazon text-2xl text-gray-800"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">AMAZON: PRIME VIDEO LIVE EVENTS</h3>
                      <p className="font-medium text-blue-600">Software Development Engineer I (Sports Partner Integration)</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-base font-semibold rounded-full">Aug 2021 &ndash; Dec 2023</span>
                    <p className="text-base text-gray-500 mt-1"><i className="fa fa-map-marker"></i> Seattle, WA</p>
                  </div>
                </div>
                <ul className="list-disc list-outside text-gray-600 space-y-2 ml-16 mt-4 text-[15px] marker:text-gray-300">
                  <li><strong className="text-gray-800">System Consolidation:</strong> Led a 6-month initiative to consolidate fragmented data systems, migrating 5.5 million records to a centralized service and increasing data coverage from 85% to over 97%.</li>
                  <li><strong className="text-gray-800">Platform Modernization:</strong> Refactored over 50,000 lines of code across 84 software packages to retire older systems, improving overall platform stability for millions of concurrent viewers.</li>
                  <li><strong className="text-gray-800">Internal Tooling:</strong> Architected a visual tool for internal operations teams to better understand and manage complex data relationships, significantly reducing the time spent on manual troubleshooting.</li>
                  <li><strong className="text-gray-800">Automation & Efficiency:</strong> Developed automated reporting pipelines that replaced manual data entry, saving operational teams approximately 5&ndash;8 hours of work per week.</li>
                </ul>
              </div>

              {/* UCLA */}
              <div className="group hover:bg-slate-50 p-4 -mx-4 rounded-xl transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border border-gray-200 overflow-hidden bg-white">
                      <img src="/images/ucla.png" alt="UCLA Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">UCLA ANDERSON SCHOOL OF MANAGEMENT</h3>
                      <p className="font-medium text-blue-600">Web Developer</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-base font-semibold rounded-full">July 2020 &ndash; July 2021</span>
                    <p className="text-base text-gray-500 mt-1"><i className="fa fa-map-marker"></i> Los Angeles, CA</p>
                  </div>
                </div>
                <ul className="list-disc list-outside text-gray-600 space-y-2 ml-16 mt-4 text-[15px] marker:text-gray-300">
                  <li><strong className="text-gray-800">Data Migration Automation:</strong> Developed automated scripts in Python to migrate over 1,150 complex website assets and researcher profiles, ensuring 100% data accuracy and future system compatibility.</li>
                  <li><strong className="text-gray-800">CMS Optimization:</strong> Optimized content management using Ingeniux, resolving JavaScript compatibility issues and ensuring 100% ADA accessibility compliance and responsive design.</li>
                  <li><strong className="text-gray-800">Project Planning:</strong> Collaborated with academic departments to scope technical requirements and milestones for large-scale content transitions.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Education & Skills Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Education */}
            <section>
              <h2 className="text-2xl font-extrabold uppercase border-b-2 border-gray-100 pb-3 mb-6 text-gray-800 flex items-center gap-2">
                <i className="fa fa-graduation-cap text-blue-500"></i> Education
              </h2>
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border border-gray-200 overflow-hidden bg-white shrink-0">
                    <img src="/images/ucla.png" alt="UCLA Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">University of California, Los Angeles (UCLA)</h3>
                    <p className="text-base text-gray-500"><i className="fa fa-map-marker"></i> Los Angeles, CA</p>
                  </div>
                </div>
                <p className="font-semibold text-blue-600 mb-3">Bachelor of Science, Computer Science</p>
                <div className="text-[14px] text-gray-600">
                  <strong className="text-gray-800 block mb-1">Core Coursework:</strong> 
                  Distributed Systems, Operating Systems, Networking, Algorithms, Databases, Software Engineering.
                </div>
              </div>
            </section>

            {/* Technical Skills */}
            <section>
              <h2 className="text-2xl font-extrabold uppercase border-b-2 border-gray-100 pb-3 mb-6 text-gray-800 flex items-center gap-2">
                <i className="fa fa-code text-blue-500"></i> Technical Skills
              </h2>
              
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Java', 'Python', 'Kotlin', 'SQL', 'Typescript', 'React', 'Node.js', 'C++'].map(skill => (
                      <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100 hover:bg-blue-100 transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Cloud & Infrastructure</h3>
                  <div className="flex flex-wrap gap-2">
                    {['AWS (CDK, Lambda, EC2, DynamoDB, S3, SQS, SNS)', 'Docker', 'CI/CD'].map(skill => (
                      <span key={skill} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-100 hover:bg-purple-100 transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Tools & Frameworks</h3>
                  <div className="flex flex-wrap gap-2">
                    {['RESTful APIs', 'TestNG', 'Spring Boot', 'Git', 'Distributed Systems Design', 'Agile/Scrum'].map(skill => (
                      <span key={skill} className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-100 transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
