import React, { useState, useEffect, createContext, useContext } from 'react';

// FAKE DATABASE & API MOCKING
// در یک پروژه واقعی، این داده‌ها از MongoDB خوانده می‌شوند و این توابع، API Route های واقعی خواهند بود.
const FAKE_DB = {
  users: [
    { _id: 'admin1', personnelNumber: 'admin', firstName: 'مدیر', lastName: 'سیستم', email: 'admin@test.com', password: 'admin', role: 'ADMIN', profileImage: 'https://placehold.co/100x100/E2E8F0/4A5568?text=Admin' },
    { _id: 'user1', personnelNumber: '1001', firstName: 'علی', lastName: 'رضایی', email: 'user1@test.com', password: '123', role: 'USER', profileImage: 'https://placehold.co/100x100/E2E8F0/4A5568?text=AR' }
  ],
  courses: [
    { _id: 'course1', name: 'آشنایی با اتوماسیون اداری', date: new Date('2025-09-15T10:00:00'), duration: 8, organizingUnit: 'واحد فرهنگی', unitManagerName: 'دکتر محمدی', unitManagerSignature: 'https://placehold.co/150x50/ffffff/4A5568?text=Signature', unitStamp: 'https://placehold.co/100x100/ffffff/4A5568?text=Stamp' },
    { _id: 'course2', name: 'اصول امنیت سایبری', date: new Date('2025-10-20T14:00:00'), duration: 12, organizingUnit: 'حراست', unitManagerName: 'مهندس اکبری', unitManagerSignature: 'https://placehold.co/150x50/ffffff/4A5568?text=Signature', unitStamp: 'https://placehold.co/100x100/ffffff/4A5568?text=Stamp' }
  ],
  enrollments: [
    { _id: 'enroll1', user: 'user1', course: 'course1', status: 'APPROVED', certificateUniqueId: '404/الف/101', certificateUrl: '#', issuedAt: new Date() }
  ]
};

// شبیه‌سازی API برای ارتباط با میکروسرویس FastAPI
const generateCertificateAPI = async (enrollmentData) => {
  console.log("Sending data to FastAPI microservice:", enrollmentData);
  // شبیه‌سازی تاخیر شبکه
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log("Certificate generated successfully!");
  return {
    certificateUrl: `/certificates/cert-${enrollmentData.nationalId}-${Date.now()}.pdf`,
    certificateUniqueId: `404/ب/${Math.floor(Math.random() * 1000)}`,
  };
};


// --- CONTEXT FOR AUTHENTICATION ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // در یک برنامه واقعی، اینجا توکن را از localStorage چک می‌کنیم
    const loggedInUser = sessionStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
    setLoading(false);
  }, []);

  const login = (personnelNumber, password) => {
    const foundUser = FAKE_DB.users.find(u => u.personnelNumber === personnelNumber && u.password === password);
    if (foundUser) {
      const userData = { ...foundUser };
      delete userData.password;
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  const value = { user, login, logout, isAuthenticated: !!user };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100"><p>در حال بارگذاری...</p></div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);


// --- UI COMPONENTS (like shadcn/ui) ---
const Card = ({ children, className = '' }) => <div className={`bg-white border rounded-lg shadow-sm p-6 ${className}`}>{children}</div>;
const Input = (props) => <input {...props} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />;
const Button = ({ children, className = '', ...props }) => <button {...props} className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ${className}`}>{children}</button>;
const Label = (props) => <label {...props} className="block text-sm font-medium text-gray-700 mb-1" />;
const Alert = ({ children, variant = 'default' }) => {
  const colors = {
    default: 'bg-gray-100 border-gray-300 text-gray-800',
    destructive: 'bg-red-100 border-red-300 text-red-800',
    success: 'bg-green-100 border-green-300 text-green-800',
  };
  return <div className={`p-4 border-l-4 rounded-md ${colors[variant]}`}>{children}</div>;
};

// --- LAYOUT COMPONENTS ---
const Header = ({ setPage }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center cursor-pointer" onClick={() => setPage(user ? (user.role === 'ADMIN' ? 'admin-courses' : 'dashboard') : 'login')}>
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          <h1 className="text-xl font-bold text-gray-800 ml-2">سامانه کارمندان دانشگاه</h1>
        </div>
        <div className="flex items-center">
          {user && (
            <div className="relative">
              <span className="mr-4 text-gray-600">خوش آمدید، {user.firstName} {user.lastName}</span>
              <button onClick={() => { logout(); setPage('login'); }} className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 transition">خروج</button>
            </div>
          )}
        </div>
      </nav>
      {user && (
        <div className="bg-gray-100">
          <div className="container mx-auto px-6 py-2 flex space-x-6 space-x-reverse">
            {user.role === 'ADMIN' ? (
              <>
                <button onClick={() => setPage('admin-courses')} className="text-gray-700 hover:text-blue-600">مدیریت دوره‌ها</button>
                <button onClick={() => setPage('admin-enrollments')} className="text-gray-700 hover:text-blue-600">مدیریت ثبت‌نام‌ها</button>
              </>
            ) : (
              <>
                <button onClick={() => setPage('dashboard')} className="text-gray-700 hover:text-blue-600">داشبورد</button>
                <button onClick={() => setPage('courses-list')} className="text-gray-700 hover:text-blue-600">لیست دوره‌ها</button>
                <button onClick={() => setPage('profile')} className="text-gray-700 hover:text-blue-600">پروفایل کاربری</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const Footer = () => (
  <footer className="bg-white mt-auto py-4 shadow-inner">
    <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
      © {new Date().getFullYear()} دانشگاه مجازی. تمام حقوق محفوظ است.
    </div>
  </footer>
);


// --- PAGE COMPONENTS ---

// 1. LOGIN PAGE
const LoginPage = ({ setPage }) => {
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (login(personnelNumber, password)) {
      // Navigation will be handled by the main App component's useEffect
    } else {
      setError('شماره پرسنلی یا رمز عبور اشتباه است.');
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">ورود به سامانه</h2>
        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="personnelNumber">شماره پرسنلی</Label>
            <Input id="personnelNumber" type="text" value={personnelNumber} onChange={e => setPersonnelNumber(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">رمز عبور</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <Button type="submit">ورود</Button>
        </form>
        <div className="text-center mt-4">
          <a href="#" className="text-sm text-blue-600 hover:underline">فراموشی رمز عبور</a>
        </div>
      </Card>
    </div>
  );
};

// 2. USER DASHBOARD
const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ count: 0, totalHours: 0 });
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    // API Call: /api/my-courses
    const userEnrollments = FAKE_DB.enrollments
      .filter(e => e.user === user._id && e.status === 'APPROVED')
      .map(e => ({
        ...e,
        course: FAKE_DB.courses.find(c => c._id === e.course)
      }));

    setEnrollments(userEnrollments);
    const totalHours = userEnrollments.reduce((sum, e) => sum + e.course.duration, 0);
    setStats({ count: userEnrollments.length, totalHours });
  }, [user]);

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">داشبورد کاربری</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-gray-700">تعداد دوره‌های گذرانده</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.count}</p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-gray-700">مجموع ساعات آموزشی</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.totalHours} ساعت</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-800 mb-4">لیست دوره‌های من</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">نام دوره</th>
                <th className="p-3">تاریخ برگزاری</th>
                <th className="p-3">مدت زمان</th>
                <th className="p-3">گواهی</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length > 0 ? enrollments.map(e => (
                <tr key={e._id} className="border-b">
                  <td className="p-3">{e.course.name}</td>
                  <td className="p-3">{new Date(e.course.date).toLocaleDateString('fa-IR')}</td>
                  <td className="p-3">{e.course.duration} ساعت</td>
                  <td className="p-3">
                    <a href={e.certificateUrl} download className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">دانلود</a>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">دوره‌ای یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// 3. ADMIN COURSES MANAGEMENT
const AdminCoursesPage = () => {
    const [courses, setCourses] = useState([]);
    // Add states for managing modal and form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCourse, setCurrentCourse] = useState(null);

    useEffect(() => {
        setCourses(FAKE_DB.courses);
    }, []);
    
    const handleEdit = (course) => {
        setCurrentCourse(course);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setCurrentCourse(null); // Reset for new course
        setIsModalOpen(true);
    };

    const handleDelete = (courseId) => {
        if (window.confirm('آیا از حذف این دوره اطمینان دارید؟')) {
            // API Call: DELETE /api/admin/courses/[courseId]
            FAKE_DB.courses = FAKE_DB.courses.filter(c => c._id !== courseId);
            setCourses([...FAKE_DB.courses]);
        }
    };

    const handleSave = (formData) => {
        if (currentCourse) {
            // Edit mode
            const index = FAKE_DB.courses.findIndex(c => c._id === currentCourse._id);
            FAKE_DB.courses[index] = { ...currentCourse, ...formData };
        } else {
            // Create mode
            const newCourse = { _id: `course${Date.now()}`, ...formData, date: new Date(formData.date) };
            FAKE_DB.courses.push(newCourse);
        }
        setCourses([...FAKE_DB.courses]);
        setIsModalOpen(false);
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">مدیریت دوره‌ها</h1>
                <Button onClick={handleCreate} className="w-auto">ایجاد دوره جدید</Button>
            </div>
            <Card>
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">نام دوره</th>
                            <th className="p-3">واحد برگزار کننده</th>
                            <th className="p-3">تاریخ</th>
                            <th className="p-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(course => (
                            <tr key={course._id} className="border-b">
                                <td className="p-3">{course.name}</td>
                                <td className="p-3">{course.organizingUnit}</td>
                                <td className="p-3">{new Date(course.date).toLocaleDateString('fa-IR')}</td>
                                <td className="p-3 space-x-2 space-x-reverse">
                                    <button onClick={() => handleEdit(course)} className="text-blue-600 hover:underline">ویرایش</button>
                                    <button onClick={() => handleDelete(course._id)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            {isModalOpen && <CourseFormModal course={currentCourse} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const CourseFormModal = ({ course, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: course?.name || '',
        date: course?.date ? new Date(course.date).toISOString().split('T')[0] : '',
        duration: course?.duration || '',
        organizingUnit: course?.organizingUnit || '',
        unitManagerName: course?.unitManagerName || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{course ? 'ویرایش دوره' : 'ایجاد دوره جدید'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input name="name" placeholder="نام دوره" value={formData.name} onChange={handleChange} required />
                    <Input name="date" type="date" value={formData.date} onChange={handleChange} required />
                    <Input name="duration" type="number" placeholder="مدت زمان (ساعت)" value={formData.duration} onChange={handleChange} required />
                    <Input name="organizingUnit" placeholder="واحد برگزار کننده" value={formData.organizingUnit} onChange={handleChange} required />
                    <Input name="unitManagerName" placeholder="نام مدیر واحد" value={formData.unitManagerName} onChange={handleChange} required />
                    {/* File inputs for signature and stamp would be here */}
                    <div className="flex justify-end space-x-4 space-x-reverse">
                        <Button type="button" onClick={onClose} className="w-auto bg-gray-500 hover:bg-gray-600">انصراف</Button>
                        <Button type="submit" className="w-auto">ذخیره</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 4. ADMIN ENROLLMENTS MANAGEMENT
const AdminEnrollmentsPage = () => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState({});

    useEffect(() => {
        // API Call: /api/admin/enrollments?status=PENDING
        const pendingEnrollments = FAKE_DB.enrollments
            .filter(e => e.status === 'PENDING')
            .map(e => ({
                ...e,
                user: FAKE_DB.users.find(u => u._id === e.user),
                course: FAKE_DB.courses.find(c => c._id === e.course)
            }));
        setEnrollments(pendingEnrollments);
    }, []);

    const handleApprove = async (enrollment) => {
        setLoading(prev => ({ ...prev, [enrollment._id]: true }));
        
        // 1. Call FastAPI microservice
        const certificateData = await generateCertificateAPI({
            firstName: enrollment.user.firstName,
            lastName: enrollment.user.lastName,
            nationalId: enrollment.user.nationalId,
            courseName: enrollment.course.name,
            // ... other data
        });

        // 2. Update enrollment in our DB
        const index = FAKE_DB.enrollments.findIndex(e => e._id === enrollment._id);
        FAKE_DB.enrollments[index] = {
            ...FAKE_DB.enrollments[index],
            status: 'APPROVED',
            ...certificateData,
            issuedAt: new Date(),
        };

        // 3. Update UI
        setEnrollments(prev => prev.filter(e => e._id !== enrollment._id));
        setLoading(prev => ({ ...prev, [enrollment._id]: false }));
    };

    const handleReject = (enrollmentId) => {
        // API Call: PUT /api/admin/enrollments/[id] with { status: 'REJECTED' }
        const index = FAKE_DB.enrollments.findIndex(e => e._id === enrollmentId);
        FAKE_DB.enrollments[index].status = 'REJECTED';
        setEnrollments(prev => prev.filter(e => e._id !== enrollmentId));
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">مدیریت ثبت‌نام‌ها (درخواست‌های جدید)</h1>
            <Card>
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">نام کاربر</th>
                            <th className="p-3">نام دوره</th>
                            <th className="p-3">تاریخ درخواست</th>
                            <th className="p-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrollments.length > 0 ? enrollments.map(e => (
                            <tr key={e._id} className="border-b">
                                <td className="p-3">{e.user.firstName} {e.user.lastName}</td>
                                <td className="p-3">{e.course.name}</td>
                                <td className="p-3">{new Date(e.createdAt || Date.now()).toLocaleDateString('fa-IR')}</td>
                                <td className="p-3 space-x-2 space-x-reverse">
                                    <button onClick={() => handleApprove(e)} disabled={loading[e._id]} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 disabled:bg-gray-400">
                                        {loading[e._id] ? 'در حال صدور...' : 'تایید'}
                                    </button>
                                    <button onClick={() => handleReject(e._id)} disabled={loading[e._id]} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 disabled:bg-gray-400">رد کردن</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="text-center p-4 text-gray-500">درخواست جدیدی برای تایید وجود ندارد.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// 5. COURSES LIST FOR USERS
const CoursesListPage = ({ setPage, setSelectedCourseId }) => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    
    useEffect(() => {
        const userEnrolledCourseIds = FAKE_DB.enrollments
            .filter(e => e.user === user._id)
            .map(e => e.course);
            
        const availableCourses = FAKE_DB.courses.map(course => ({
            ...course,
            isEnrolled: userEnrolledCourseIds.includes(course._id)
        }));
        setCourses(availableCourses);
    }, [user]);

    const handleEnroll = (courseId) => {
        // API Call: POST /api/enrollments { courseId }
        const newEnrollment = {
            _id: `enroll${Date.now()}`,
            user: user._id,
            course: courseId,
            status: 'PENDING',
            createdAt: new Date(),
        };
        FAKE_DB.enrollments.push(newEnrollment);
        // Refresh the list to show the updated status
        setCourses(prev => prev.map(c => c._id === courseId ? { ...c, isEnrolled: true } : c));
        alert('درخواست ثبت‌نام شما با موفقیت ارسال شد و در انتظار تایید مدیر است.');
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">لیست دوره‌های موجود</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <Card key={course._id} className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">{course.name}</h2>
                        <p className="text-gray-600 mb-1"><strong>واحد برگزار کننده:</strong> {course.organizingUnit}</p>
                        <p className="text-gray-600 mb-1"><strong>تاریخ:</strong> {new Date(course.date).toLocaleDateString('fa-IR')}</p>
                        <p className="text-gray-600 mb-4"><strong>مدت:</strong> {course.duration} ساعت</p>
                        <div className="mt-auto">
                            {course.isEnrolled ? (
                                <Button disabled className="w-full bg-gray-400 cursor-not-allowed">ثبت‌نام شده</Button>
                            ) : (
                                <Button onClick={() => handleEnroll(course._id)} className="w-full">ثبت‌نام در دوره</Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT (Router) ---
export default function App() {
  const [page, setPage] = useState('login'); // 'login', 'dashboard', 'admin-courses', etc.

  return (
    <AuthProvider>
      <MainContent page={page} setPage={setPage} />
    </AuthProvider>
  );
}

const MainContent = ({ page, setPage }) => {
  const { user, isAuthenticated } = useAuth();
  
  // This useEffect handles redirection after login/logout
  useEffect(() => {
    if (isAuthenticated) {
      if (page === 'login') {
        setPage(user.role === 'ADMIN' ? 'admin-courses' : 'dashboard');
      }
    } else {
      if (page !== 'login') {
        setPage('login');
      }
    }
  }, [isAuthenticated, page, setPage, user]);

  const renderPage = () => {
    if (!isAuthenticated) return <LoginPage setPage={setPage} />;
    
    switch (page) {
      case 'dashboard':
        return <DashboardPage />;
      case 'admin-courses':
        return <AdminCoursesPage />;
      case 'admin-enrollments':
        return <AdminEnrollmentsPage />;
      case 'courses-list':
        return <CoursesListPage />;
      // Add 'profile' page component here later
      case 'profile':
        return <div className="container mx-auto p-8"><h1 className="text-2xl">صفحه پروفایل (در دست ساخت)</h1></div>;
      default:
        return user.role === 'ADMIN' ? <AdminCoursesPage /> : <DashboardPage />;
    }
  };

  return (
    <div dir="rtl" className="flex flex-col min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
      <Header setPage={setPage} />
      <main className="flex-grow">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
};
