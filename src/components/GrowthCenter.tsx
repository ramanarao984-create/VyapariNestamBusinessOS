import React, { useState } from 'react';
import { 
  Sparkles, TrendingUp, Users, Star, MessageSquare, MapPin, 
  Search, PhoneCall, Navigation, Globe, ArrowUpRight, CheckCircle2,
  Calendar, DollarSign, Filter, Share2, Layers
} from 'lucide-react';
import { SEOAuditEngine } from './SEOAuditEngine';

interface GrowthCenterProps {
  businessName?: string;
  cityLandmark?: string;
  industryId?: string;
  reviewLink?: string;
  accessToken?: string | null;
  spreadsheetId?: string | null;
}

export const GrowthCenter: React.FC<GrowthCenterProps> = ({
  businessName = 'Sri Sai Dental Clinic',
  cityLandmark = 'Vijayawada',
  industryId = 'dental',
  reviewLink = '',
  accessToken = null,
  spreadsheetId = null
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'overview' | 'seo'>('overview');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [dateRange, setDateRange] = useState('01 Jul - 17 Jul 2026');

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Clean Header Card matching Patients section style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-3xs">
        <div>
          <h1 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
            Growth & Visibility
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            All growth channels, Google Business reviews, automated WhatsApp campaigns, and local visibility in one place.
          </p>
        </div>

        {/* Location & Date Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Workspace Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            <button
              onClick={() => setSelectedSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedSubTab === 'overview' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'hover:text-slate-900'
              }`}
            >
              📊 Growth Analytics
            </button>
            <button
              onClick={() => setSelectedSubTab('seo')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedSubTab === 'seo' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'hover:text-slate-900'
              }`}
            >
              🔍 Google SEO Audit
            </button>
          </div>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All Locations">All Locations</option>
            <option value="Vijayawada">Vijayawada Branch</option>
            <option value="Guntur">Guntur Branch</option>
          </select>

          <span className="bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-teal-600" />
            {dateRange}
          </span>
        </div>
      </div>

      {selectedSubTab === 'seo' ? (
        <SEOAuditEngine
          businessName={businessName}
          cityLandmark={cityLandmark}
          industryId={industryId}
          reviewLink={reviewLink}
          accessToken={accessToken}
          spreadsheetId={spreadsheetId}
        />
      ) : (
        <div className="space-y-6">
          
          {/* Top 5 KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">New Leads</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900 font-display">128</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">↑ 18%</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Leads Converted</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900 font-display">42</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">↑ 32.8%</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">New Reviews</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900 font-display">23</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">★ 4.8</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Recall Booked</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900 font-display">18</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">↑ 25%</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 col-span-2 lg:col-span-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Revenue from Growth</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-purple-700 font-display">₹68,450</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">↑ 24%</span>
              </div>
            </div>

          </div>

          {/* Middle Row: Google Business, Reviews Summary & Top Campaigns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Google Business Profile Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  Google Business Profile
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Connected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Profile Views</p>
                  <p className="text-base font-extrabold text-slate-900">4,582</p>
                  <p className="text-[10px] font-bold text-emerald-600">↑ 15% vs last month</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Direct Calls</p>
                  <p className="text-base font-extrabold text-slate-900">312</p>
                  <p className="text-[10px] font-bold text-emerald-600">↑ 12% vs last month</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Maps Directions</p>
                  <p className="text-base font-extrabold text-slate-900">178</p>
                  <p className="text-[10px] font-bold text-emerald-600">↑ 8% vs last month</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Website Visits</p>
                  <p className="text-base font-extrabold text-slate-900">264</p>
                  <p className="text-[10px] font-bold text-emerald-600">↑ 10% vs last month</p>
                </div>
              </div>
            </div>

            {/* Review Summary Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                Review Summary
              </h3>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-3xl font-black text-slate-900 font-display">4.8</span>
                  <div className="flex items-center gap-0.5 text-amber-500 my-1 justify-center">
                    {'★'.repeat(5)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">Based on 148 reviews</p>
                </div>

                {/* Rating Progress Bars */}
                <div className="flex-1 space-y-1 text-[10px] font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>5★</span>
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[85%]" />
                    </div>
                    <span>120</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>4★</span>
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[10%]" />
                    </div>
                    <span>18</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>3★</span>
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[3%]" />
                    </div>
                    <span>6</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">Response Rate</p>
                  <p className="font-black text-slate-900">92%</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">Avg Response Time</p>
                  <p className="font-black text-slate-900">2h 15m</p>
                </div>
              </div>
            </div>

            {/* Top Performing Campaigns */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Top Performing Campaigns
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-slate-900">Monsoon Dental Care</p>
                    <p className="text-[10px] text-slate-400">Sent: 1120 • Replied: 210 • Booked: 28</p>
                  </div>
                  <span className="font-mono font-black text-purple-700">₹24,500</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-slate-900">Tooth Cleaning Recall</p>
                    <p className="text-[10px] text-slate-400">Sent: 860 • Replied: 152 • Booked: 19</p>
                  </div>
                  <span className="font-mono font-black text-purple-700">₹18,200</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-slate-900">Review Request Campaign</p>
                    <p className="text-[10px] text-slate-400">Sent: 320 • Reviews Received: 23</p>
                  </div>
                  <span className="font-bold text-amber-600">★ 4.9</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Lead Sources Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Lead Acquisition Sources
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
                <span className="text-lg font-black text-slate-900">45%</span>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Google Search</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
                <span className="text-lg font-black text-slate-900">25%</span>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Google Maps</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
                <span className="text-lg font-black text-slate-900">16%</span>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">WhatsApp</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
                <span className="text-lg font-black text-slate-900">10%</span>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Patient Referral</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center col-span-2 sm:col-span-1">
                <span className="text-lg font-black text-slate-900">5%</span>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Others / Walk-in</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
