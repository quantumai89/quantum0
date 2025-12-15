import { Link } from 'react-router-dom';
import { Play, BookOpen, Award, Sparkles, Brain, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const HomePage = () => {
  const featuredCourses = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      description: 'Master the fundamentals of ML with hands-on projects',
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=250&fit=crop',
      category: 'AI & Machine Learning',
      difficulty: 'Beginner',
      duration: 240,
    },
    {
      id: '2',
      title: 'Web Development Bootcamp',
      description: 'Build modern web applications from scratch',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop',
      category: 'Web Development',
      difficulty: 'Intermediate',
      duration: 360,
    },
    {
      id: '3',
      title: 'Data Science Fundamentals',
      description: 'Analyze data and extract meaningful insights',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
      category: 'Data Science',
      difficulty: 'Beginner',
      duration: 180,
    },
    {
      id: '4',
      title: 'Python Programming Mastery',
      description: 'From basics to advanced Python concepts',
      thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop',
      category: 'Programming',
      difficulty: 'Beginner',
      duration: 300,
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.02),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-block mb-4">
                <span className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
                  ✨ AI-Powered Education
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-bold leading-tight mb-6 text-gray-900">
                Learn Anything.
                <br />
                <span className="text-gray-700">
                  Taught by AI Instructors
                </span>
                <br />
                That Feel Real.
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Experience the future of education with realistic AI instructors featuring perfect lip-sync,
                natural facial expressions, and interactive learning at scale.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/courses">
                  <Button size="lg" variant="primary" className="bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                    <Play className="w-5 h-5 mr-2" />
                    Start Learning
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button size="lg" variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all w-full sm:w-auto">
                    View Courses
                  </Button>
                </Link>
              </div>
            </div>

            {/* AI Instructor Preview */}
            <div className="relative animate-slide-up">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
                <img
                  src="/assets/images/ai model.jpg"
                  alt="AI Instructor - Professor Sharma"
                  className="w-full h-auto object-cover aspect-square"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl px-5 py-3.5 shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                          <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                        </div>
                        <span className="text-gray-900 font-semibold text-sm">Professor Sharma Teaching Live</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-1 h-2.5 bg-emerald-500 rounded-sm animate-pulse" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-3.5 bg-emerald-500 rounded-sm animate-pulse" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-3 bg-emerald-500 rounded-sm animate-pulse" style={{ animationDelay: '300ms' }} />
                        <div className="w-1 h-4 bg-emerald-500 rounded-sm animate-pulse" style={{ animationDelay: '450ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-40 h-40 bg-gray-300 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-gray-400 rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDuration: '4s' }} />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start your AI-powered learning journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
                <BookOpen className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">1. Choose Course</h3>
              <p className="text-gray-600">
                Browse our extensive catalog and select a course that matches your learning goals and skill level.
              </p>
            </div>

            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary-100 rounded-full mb-6">
                <Sparkles className="w-10 h-10 text-secondary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">2. AI Instructor Teaches</h3>
              <p className="text-gray-600">
                Learn from realistic AI instructors with perfect lip-sync, natural expressions, and clear explanations.
              </p>
            </div>

            <div className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <Award className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">3. Track Progress</h3>
              <p className="text-gray-600">
                Monitor your learning journey, complete lessons, and earn certificates to showcase your achievements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Featured Courses</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start learning with our most popular courses taught by AI instructors
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {featuredCourses.map((course, index) => (
              <Card key={course.id} hover className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                      {course.category}
                    </span>
                    <span className="text-xs text-gray-500">{course.duration} min</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">{course.difficulty}</span>
                    <Link to={`/courses/${course.id}`}>
                      <Button size="sm">View Course</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/courses">
              <Button size="lg" variant="outline">
                Browse All Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">AI-Powered, Human-Like Teaching</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Cutting-edge technology delivering an unparalleled learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Neural TTS</h3>
              <p className="text-gray-300">
                Natural-sounding voice synthesis that brings lessons to life with perfect pronunciation and intonation.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-600 rounded-full mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Perfect Lip-Sync</h3>
              <p className="text-gray-300">
                Advanced motion synthesis ensures every word matches facial movements for realistic instruction.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Scalable Learning</h3>
              <p className="text-gray-300">
                High-quality education accessible to everyone, anywhere, at any time with consistent excellence.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
