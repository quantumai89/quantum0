import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, BarChart3, BookOpen, Play, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';

export const CourseDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [expandedModules, setExpandedModules] = useState<string[]>(['1']);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Mock data
  const course = {
    id: id || '1',
    title: 'Introduction to Machine Learning',
    description: 'Master the fundamentals of machine learning with hands-on projects and real-world applications.',
    longDescription: 'This comprehensive course covers everything you need to know to get started with machine learning. From basic concepts to advanced algorithms, you\'ll learn through practical examples and real-world projects.',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop',
    category: 'AI & Machine Learning',
    difficulty: 'Beginner',
    duration: 240,
    aiInstructor: {
      name: 'Dr. Sarah Chen',
      avatarImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
      description: 'PhD in Computer Science, 10+ years teaching experience',
    },
    learningObjectives: [
      'Understand core machine learning concepts and algorithms',
      'Build and train ML models using Python and scikit-learn',
      'Apply supervised and unsupervised learning techniques',
      'Evaluate model performance and optimize hyperparameters',
      'Deploy ML models to production environments',
    ],
    modules: [
      {
        id: '1',
        title: 'Introduction to Machine Learning',
        lessons: [
          { id: '1-1', title: 'What is Machine Learning?', duration: 15 },
          { id: '1-2', title: 'Types of Machine Learning', duration: 20 },
          { id: '1-3', title: 'Setting Up Your Environment', duration: 25 },
        ],
      },
      {
        id: '2',
        title: 'Supervised Learning',
        lessons: [
          { id: '2-1', title: 'Linear Regression', duration: 30 },
          { id: '2-2', title: 'Logistic Regression', duration: 25 },
          { id: '2-3', title: 'Decision Trees', duration: 30 },
        ],
      },
      {
        id: '3',
        title: 'Unsupervised Learning',
        lessons: [
          { id: '3-1', title: 'K-Means Clustering', duration: 25 },
          { id: '3-2', title: 'Hierarchical Clustering', duration: 20 },
          { id: '3-3', title: 'Principal Component Analysis', duration: 30 },
        ],
      },
    ],
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleEnroll = () => {
    setIsEnrolled(true);
  };

  const totalLessons = course.modules.reduce((acc, module) => acc + module.lessons.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {course.difficulty}
                </span>
              </div>
              <h1 className="text-4xl font-display font-bold mb-4">{course.title}</h1>
              <p className="text-xl text-primary-100 mb-6">{course.description}</p>

              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{totalLessons} lessons</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>{course.difficulty}</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <Card>
              <div className="p-6">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
                  What You'll Learn
                </h2>
                <ul className="space-y-3">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Course Curriculum */}
            <Card>
              <div className="p-6">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
                  Course Curriculum
                </h2>
                <div className="space-y-2">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-semibold text-gray-500">
                            Module {moduleIndex + 1}
                          </span>
                          <h3 className="font-semibold text-gray-900">{module.title}</h3>
                        </div>
                        {expandedModules.includes(module.id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>

                      {expandedModules.includes(module.id) && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-white transition"
                            >
                              <div className="flex items-center space-x-3">
                                <Play className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700">
                                  {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">{lesson.duration} min</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Instructor */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Your AI Instructor</h3>
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={course.aiInstructor.avatarImageUrl}
                      alt={course.aiInstructor.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{course.aiInstructor.name}</p>
                      <p className="text-sm text-gray-600">{course.aiInstructor.description}</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                    <Play className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              </Card>

              {/* Enroll Button */}
              <Card>
                <div className="p-6">
                  {isAuthenticated ? (
                    isEnrolled ? (
                      <Link to={`/learn/${course.id}/${course.modules[0].lessons[0].id}`}>
                        <Button size="lg" className="w-full">
                          <Play className="w-5 h-5 mr-2" />
                          Continue Learning
                        </Button>
                      </Link>
                    ) : (
                      <Button size="lg" className="w-full" onClick={handleEnroll}>
                        Enroll Now - Free
                      </Button>
                    )
                  ) : (
                    <Link to="/login">
                      <Button size="lg" className="w-full">
                        Sign In to Enroll
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
