import { Link } from 'react-router-dom';
import { Play, Award, Clock, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useAuth } from '@/contexts/AuthContext';

export const DashboardPage = () => {
  const { user } = useAuth();

  // Mock data
  const enrolledCourses = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=250&fit=crop',
      progress: 45,
      lastLesson: 'Linear Regression',
      totalLessons: 12,
      completedLessons: 5,
    },
    {
      id: '2',
      title: 'Web Development Bootcamp',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop',
      progress: 20,
      lastLesson: 'HTML Basics',
      totalLessons: 20,
      completedLessons: 4,
    },
  ];

  const certificates = [
    {
      id: '1',
      courseTitle: 'Python Programming Mastery',
      issuedAt: '2024-01-15',
      certificateNumber: 'QAI-2024-001',
    },
  ];

  const stats = {
    hoursLearned: 24,
    lessonsCompleted: 45,
    coursesCompleted: 2,
    currentStreak: 7,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-xl text-gray-600">Continue your learning journey</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
                <Clock className="w-6 h-6 text-primary-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.hoursLearned}</p>
              <p className="text-sm text-gray-600">Hours Learned</p>
            </div>
          </Card>

          <Card>
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.lessonsCompleted}</p>
              <p className="text-sm text-gray-600">Lessons Completed</p>
            </div>
          </Card>

          <Card>
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary-100 rounded-full mb-3">
                <Award className="w-6 h-6 text-secondary-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.coursesCompleted}</p>
              <p className="text-sm text-gray-600">Courses Completed</p>
            </div>
          </Card>

          <Card>
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
                <span className="text-2xl">🔥</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.currentStreak}</p>
              <p className="text-sm text-gray-600">Day Streak</p>
            </div>
          </Card>
        </div>

        {/* Enrolled Courses */}
        <div className="mb-12">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">My Courses</h2>
          {enrolledCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {enrolledCourses.map((course) => (
                <Card key={course.id} hover>
                  <div className="flex">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-32 h-32 object-cover"
                    />
                    <div className="flex-1 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Last watched: {course.lastLesson}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1 mr-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                        <ProgressRing percentage={course.progress} size={60} strokeWidth={6} />
                      </div>
                      <Link to={`/courses/${course.id}`}>
                        <Button size="sm" className="w-full">
                          <Play className="w-4 h-4 mr-2" />
                          Continue Learning
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">You haven't enrolled in any courses yet.</p>
                <Link to="/courses">
                  <Button>Browse Courses</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Certificates */}
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">My Certificates</h2>
          {certificates.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <Card key={cert.id} hover>
                  <div className="p-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-full mb-4 mx-auto">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                      {cert.courseTitle}
                    </h3>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 text-center mb-4">
                      Certificate #{cert.certificateNumber}
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Download Certificate
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="p-12 text-center">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Complete courses to earn certificates!</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
