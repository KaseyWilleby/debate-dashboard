
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  Calendar,
  BarChart,
  BookOpen,
  Video,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // If user is already logged in, redirect to their team dashboard
  useEffect(() => {
    if (!isLoading && user) {
      if (user.teamId) {
        // User has a team, redirect to their dashboard
        router.push(`/${user.teamId}/dashboard`);
      } else if (user.email === 'kaseywilleby@gmail.com' || user.role === 'superadmin') {
        // User doesn't have a teamId yet - needs to run migration
        router.push('/cywoods/migrate-to-multi-tenant');
      }
    }
  }, [user, isLoading, router]);

  const features = [
    {
      icon: Calendar,
      title: "Tournament Management",
      description: "Register for tournaments, track entries, and manage paperwork all in one place."
    },
    {
      icon: Users,
      title: "Team Coordination",
      description: "Schedule practice sessions, book coaching time, and coordinate with teammates."
    },
    {
      icon: Video,
      title: "Practice Tools",
      description: "Record speeches, prepare debate cases, and practice with AI-powered feedback."
    },
    {
      icon: BarChart,
      title: "Performance Analytics",
      description: "Track tournament results, analyze performance trends, and identify areas for improvement."
    },
    {
      icon: BookOpen,
      title: "Learning Resources",
      description: "Access comprehensive guides for debate, speech, and interpretation events."
    },
    {
      icon: Trophy,
      title: "Results Tracking",
      description: "Automatically import tournament results and track your competitive journey."
    }
  ];

  const benefits = [
    "Centralized tournament registration and management",
    "Automated fee tracking and paperwork checklists",
    "Practice session scheduling with teammates and coaches",
    "Video recording and review tools",
    "AI-powered speech and debate practice",
    "Comprehensive performance analytics",
    "Team-wide resource sharing"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Debate Dashboard
            </h1>
          </div>
          <Button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          The All-in-One Platform for<br />Speech & Debate Teams
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Streamline tournament management, enhance practice sessions, and track performance
          all in one powerful platform built specifically for competitive speech and debate.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">
          Everything Your Team Needs
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border bg-white hover:shadow-lg transition-shadow"
            >
              <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-blue-50 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            Why Debate Dashboard?
          </h3>
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold mb-6">
          Ready to Transform Your Team?
        </h3>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join teams already using Debate Dashboard to streamline their operations
          and improve their competitive performance.
        </p>
        <Button
          size="lg"
          onClick={() => router.push("/login")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Get Started Today
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2026 Debate Dashboard. Built for competitive speech and debate teams.</p>
        </div>
      </footer>
    </div>
  );
}
