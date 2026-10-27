import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';
import MyClasses from './myclass';
import StudentHome from './shome';
import { getRoleAccounts, DEMO_ACCOUNTS } from './authStore';

describe('Cognify Web Application', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders Cognify brand name and portal buttons', () => {
    render(<Login />);
    expect(screen.getByRole('heading', { name: /COGNIFY/i })).toBeInTheDocument();
    expect(screen.getByText(/Teacher Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Student Portal/i)).toBeInTheDocument();
  });

  test('provides pre-seeded demo accounts for both roles', () => {
    const teacherAccounts = getRoleAccounts('teacher');
    const studentAccounts = getRoleAccounts('student');

    expect(teacherAccounts.length).toBeGreaterThan(0);
    expect(studentAccounts.length).toBeGreaterThan(0);

    expect(DEMO_ACCOUNTS.teacher.email).toBe('teacher@cognify.edu');
    expect(DEMO_ACCOUNTS.student.email).toBe('student@cognify.edu');
  });

  test('role-separated credential stores do not cross-authenticate', () => {
    const teacherAccounts = getRoleAccounts('teacher');
    const studentAccounts = getRoleAccounts('student');

    const teacherAsStudent = studentAccounts.find(a => a.email === 'teacher@cognify.edu');
    const studentAsTeacher = teacherAccounts.find(a => a.email === 'student@cognify.edu');

    expect(teacherAsStudent).toBeUndefined();
    expect(studentAsTeacher).toBeUndefined();
  });

  test('MyClasses renders dual upload zones for answer paper and question paper', () => {
    const sampleClasses = [
      {
        id: 'class-test',
        name: 'Class 10A',
        icon: '📘',
        classAverage: 75,
        studentsList: [
          { id: 's1', name: 'Kabir Singh', score: 65, performanceLevel: 'average', specialCare: false, numericalSkills: 'secure' }
        ]
      }
    ];

    render(
      <MyClasses
        classList={sampleClasses}
        onAddClass={() => {}}
        onAddStudent={() => {}}
        onDeleteStudent={() => {}}
        onStudentAnalysis={() => {}}
        onDeleteClass={() => {}}
        onWorksheetSaved={() => {}}
      />
    );

    // Click into Class 10A
    fireEvent.click(screen.getByRole('button', { name: /Open Class 10A/i }));

    // Verify dual upload zones are present
    expect(screen.getByText(/Upload answer paper/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload question paper/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Evaluate Paper/i })).toBeInTheDocument();
  });

  test('StudentHome renders class options in the select class dropdown', () => {
    // Pre-seed a subject so scanner view can be opened
    localStorage.setItem(
      'cognify_subjects_student',
      JSON.stringify([{ id: 'sub-math', name: 'Mathematics' }])
    );

    render(
      <StudentHome
        student={{
          username: 'student',
          fullName: 'Aarav Mehta',
          email: 'student@cognify.edu',
          className: 'Class 10A'
        }}
        onLogout={() => {}}
      />
    );

    // Open Mathematics subject to show scanner
    fireEvent.click(screen.getByRole('button', { name: /Open Mathematics/i }));

    // Verify select class dropdown is rendered
    const classSelect = screen.getByRole('combobox');
    expect(classSelect).toBeInTheDocument();

    // Verify class options exist and are displayed
    expect(screen.getByRole('option', { name: /Select class/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Class 10A/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Class 10B/i })).toBeInTheDocument();
  });
});


