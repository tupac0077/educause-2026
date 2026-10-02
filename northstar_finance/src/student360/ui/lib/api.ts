import { useQuery, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseSuspenseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
export class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;
    constructor(status: number, statusText: string, body: unknown){
        super(`HTTP ${status}: ${statusText}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}
export interface CaseUpdateRequest {
    next_follow_up?: string | null;
    note?: string | null;
    status?: string | null;
    student_id: number;
}
export interface ChatRequest {
    conversation_id?: string | null;
    message: string;
}
export interface ChatResponse {
    conversation_id?: string | null;
    response: string;
    sql_query?: string | null;
}
export interface ComplexValue {
    display?: string | null;
    primary?: boolean | null;
    ref?: string | null;
    type?: string | null;
    value?: string | null;
}
export interface CourseAnalytics {
    avg_grade_point?: number | null;
    avg_mark?: number | null;
    course_code: string;
    course_id: number;
    course_name: string;
    credit_points?: number | null;
    delivery_mode?: string | null;
    faculty?: string | null;
    fail_count?: number | null;
    fail_rate_pct?: number | null;
    pass_count?: number | null;
    total_enrolled?: number | null;
    withdrawal_count?: number | null;
}
export interface ColumnTag {
    column_name: string;
    tag_name: string;
    tag_value: string;
}
export interface TableTag {
    tag_name: string;
    tag_value: string;
}
export interface MaskingDemo {
    student_id: number;
    full_name?: string | null;
    email_privileged?: string | null;
    email_masked?: string | null;
    dob_privileged?: string | null;
    dob_masked?: string | null;
    national_id_privileged?: string | null;
    national_id_masked?: string | null;
}
export interface FacultyRowCount {
    faculty: string;
    student_count: number;
}
export interface AdvisorViewStats {
    faculty: string;
    student_count: number;
    avg_gpa?: number | null;
    at_risk_count: number;
    international_count: number;
}
export interface AdvisorSampleRow {
    student_id: number;
    full_name?: string | null;
    email?: string | null;
    date_of_birth?: string | null;
    student_national_id?: string | null;
    program_name?: string | null;
    gpa?: number | null;
    student_status?: string | null;
    risk_level?: string | null;
}
export interface AdvisorView {
    persona: string;
    faculty?: string | null;
    stats?: AdvisorViewStats | null;
    sample_students: AdvisorSampleRow[];
}
export interface GovernanceOverview {
    column_tags: ColumnTag[];
    table_tags: TableTag[];
    masking_demo?: MaskingDemo | null;
    row_filter_counts: FacultyRowCount[];
    current_user?: string | null;
}
export interface DashboardStats {
    active_students: number;
    at_risk_students: number;
    avg_gpa: number;
    high_risk_count: number;
    low_risk_count: number;
    medium_risk_count: number;
    total_students: number;
}
export interface EffectivenessByEquity {
    count?: number;
    gap_pp?: number | null;
    group: string;
    intervened_pass_rate?: number | null;
    not_intervened_pass_rate?: number | null;
}
export interface EffectivenessByType {
    avg_gpa?: number | null;
    count?: number;
    intervention_type: string;
    pass_rate?: number | null;
    resolved_count?: number;
}
export interface EffectivenessMetrics {
    intervened_avg_gpa?: number | null;
    intervened_avg_lms?: number | null;
    intervened_count?: number;
    intervened_pass_rate?: number | null;
    intervened_retention_pct?: number | null;
    not_intervened_avg_gpa?: number | null;
    not_intervened_avg_lms?: number | null;
    not_intervened_count?: number;
    not_intervened_pass_rate?: number | null;
    not_intervened_retention_pct?: number | null;
}
export interface EnrollmentForecastPoint {
    active_students?: number | null;
    active_students_lower?: number | null;
    active_students_upper?: number | null;
    ds: string;
    is_forecast?: boolean;
    term_code: string;
    total_enrollments?: number | null;
    total_enrollments_lower?: number | null;
    total_enrollments_upper?: number | null;
}
export interface EnrollmentRecord {
    course_code?: string | null;
    course_name?: string | null;
    credit_points_earned?: number | null;
    enrollment_id: number;
    grade?: string | null;
    grade_point?: number | null;
    mark?: number | null;
    term_code?: string | null;
}
export interface ExecutiveMetrics {
    active_students: number;
    at_risk_students: number;
    attrition_rate_pct: number;
    avg_gpa: number;
    avg_pass_rate?: number | null;
    completion_rate_pct?: number | null;
    continuing_family_pass_rate?: number | null;
    first_in_family_pass_rate?: number | null;
    graduated_students: number;
    international_at_risk: number;
    international_total: number;
    retention_rate_pct: number;
    revenue_at_risk: number;
    revenue_lost: number;
    supported_student_pass_rate?: number | null;
    total_interventions: number;
    total_students: number;
    unsupported_student_pass_rate?: number | null;
    withdrawn_students: number;
}
export interface FacultyPerformance {
    at_risk_students?: number | null;
    attrition_risk_pct?: number | null;
    avg_gpa?: number | null;
    faculty: string;
    first_in_family_students?: number | null;
    graduated_students?: number | null;
    graduation_rate_pct?: number | null;
    international_students?: number | null;
    program_level?: string | null;
    total_students?: number | null;
    withdrawn_students?: number | null;
}
export interface ForecastPoint {
    ds: string;
    fail_rate?: number | null;
    fail_rate_lower?: number | null;
    fail_rate_upper?: number | null;
    is_forecast?: boolean;
    pass_rate?: number | null;
    pass_rate_lower?: number | null;
    pass_rate_upper?: number | null;
    term_code: string;
    withdrawal_rate?: number | null;
    withdrawal_rate_lower?: number | null;
    withdrawal_rate_upper?: number | null;
}
export interface HTTPValidationError {
    detail?: ValidationError[];
}
export interface InterventionPlan {
    action_items?: string[] | null;
    follow_up_schedule?: string | null;
    intervention_type?: string | null;
    meeting_agenda?: string[] | null;
    referrals?: string[] | null;
    risk_factors?: string[] | null;
    student_id: number;
    student_name?: string | null;
    success_criteria?: string | null;
    summary?: string | null;
    talking_points?: string[] | null;
    urgency?: string | null;
}
export interface InterventionRequest {
    student_id: number;
}
export interface Name {
    family_name?: string | null;
    given_name?: string | null;
}
export interface OutcomeByEquity {
    avg_gpa_lift?: number | null;
    avg_pass_rate_lift?: number | null;
    de_risked?: number;
    group: string;
    intervened?: number;
}
export interface OutcomeByFaculty {
    avg_gpa_lift?: number | null;
    de_risked?: number;
    de_risked_pct?: number | null;
    faculty: string;
    intervened?: number;
}
export interface OutcomeStudent {
    domestic_international?: string | null;
    faculty?: string | null;
    first_in_family?: boolean | null;
    full_name?: string | null;
    gpa_after?: number | null;
    gpa_before?: number | null;
    gpa_change?: number | null;
    intervention_type?: string | null;
    lms_after?: number | null;
    lms_before?: number | null;
    outcome?: string | null;
    pass_rate_after?: number | null;
    pass_rate_before?: number | null;
    program_name?: string | null;
    risk_after?: string | null;
    risk_before?: string | null;
    student_id: number;
}
export interface OutcomeSummary {
    avg_gpa_lift?: number | null;
    avg_lms_lift?: number | null;
    avg_pass_rate_lift?: number | null;
    de_risked?: number;
    declined?: number;
    improved?: number;
    retention_rate?: number | null;
    total_intervened?: number;
    unchanged?: number;
}
export interface OutcomeTrendPoint {
    at_risk_count?: number | null;
    avg_gpa?: number | null;
    avg_lms_activities?: number | null;
    avg_pass_rate?: number | null;
    de_risked_cumulative?: number | null;
    month: string;
}
export interface OutreachEmail {
    body?: string | null;
    intervention_type?: string | null;
    student_email?: string | null;
    student_id: number;
    student_name?: string | null;
    subject?: string | null;
    tone?: string | null;
}
export interface OutreachLogEntry {
    intervention_type?: string | null;
    next_follow_up?: string | null;
    notes?: string[] | null;
    resolved_at?: string | null;
    sent_at?: string | null;
    status?: string;
    student_id: number;
    student_name?: string | null;
    subject?: string | null;
    tone?: string | null;
}
export interface OutreachLogRequest {
    intervention_type?: string | null;
    student_id: number;
    student_name?: string | null;
    subject?: string | null;
    tone?: string | null;
}
export interface OutreachRequest {
    custom_context?: string | null;
    intervention_plan?: string | null;
    student_id: number;
    tone?: string;
}
export interface OutreachStudent {
    campus?: string | null;
    courses_failed?: number | null;
    domestic_international?: string | null;
    email: string;
    faculty?: string | null;
    first_in_family?: boolean | null;
    full_name: string;
    gpa?: number | null;
    lms_active_days?: number | null;
    pass_rate_pct?: number | null;
    pending_follow_ups?: number | null;
    program_name?: string | null;
    recommended_action?: string | null;
    risk_category?: string | null;
    risk_level?: string | null;
    risk_score?: number | null;
    student_id: number;
    student_status?: string | null;
    total_lms_activities?: number | null;
    total_support_interactions?: number | null;
}
export interface RetentionByFaculty {
    active_count: number;
    at_risk_count: number;
    faculty: string;
    graduated_count: number;
    retention_rate_pct?: number | null;
    total_students: number;
    withdrawn_count: number;
}
export interface RiskDistribution {
    count: number;
    risk_category: string;
}
export interface RiskDriver {
    at_risk_avg?: number | null;
    healthy_avg?: number | null;
    metric: string;
    unit?: string | null;
}
export interface Student360Detail {
    age?: number | null;
    avg_grade_point?: number | null;
    avg_session_duration?: number | null;
    campus?: string | null;
    cohort?: string | null;
    country_of_origin?: string | null;
    courses_failed?: number | null;
    courses_passed?: number | null;
    courses_withdrawn?: number | null;
    credit_points_required?: number | null;
    degree_completion_pct?: number | null;
    domestic_international?: string | null;
    email: string;
    enrollment_date?: string | null;
    faculty?: string | null;
    financial_aid?: boolean | null;
    first_in_family?: boolean | null;
    forum_posts?: number | null;
    full_name: string;
    gender?: string | null;
    gpa?: number | null;
    last_support_date?: string | null;
    lectures_viewed?: number | null;
    lms_active_days?: number | null;
    mental_health_interactions?: number | null;
    pass_rate_pct?: number | null;
    pending_follow_ups?: number | null;
    predicted_at_risk?: number | null;
    program_code?: string | null;
    program_level?: string | null;
    program_name?: string | null;
    risk_category?: string | null;
    risk_level?: string | null;
    risk_score?: number | null;
    student_id: number;
    student_status?: string | null;
    terms_enrolled?: number | null;
    total_credits_earned?: number | null;
    total_enrollments?: number | null;
    total_lms_activities?: number | null;
    total_lms_minutes?: number | null;
    total_support_interactions?: number | null;
}
export interface StudentSummary {
    campus?: string | null;
    courses_failed?: number | null;
    email: string;
    faculty?: string | null;
    full_name: string;
    gpa?: number | null;
    pass_rate_pct?: number | null;
    program_name?: string | null;
    risk_category?: string | null;
    risk_level?: string | null;
    risk_score?: number | null;
    student_id: number;
    student_status?: string | null;
    total_lms_activities?: number | null;
}
export interface SupportInteraction {
    channel: string;
    duration_minutes: number;
    follow_up_required: boolean;
    interaction_date: string;
    interaction_id: number;
    notes?: string | null;
    outcome: string;
    support_type: string;
}
export interface User {
    active?: boolean | null;
    display_name?: string | null;
    emails?: ComplexValue[] | null;
    entitlements?: ComplexValue[] | null;
    external_id?: string | null;
    groups?: ComplexValue[] | null;
    id?: string | null;
    name?: Name | null;
    roles?: ComplexValue[] | null;
    schemas?: UserSchema[] | null;
    user_name?: string | null;
}
export const UserSchema = {
    "urn:ietf:params:scim:schemas:core:2.0:User": "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:workspace:2.0:User": "urn:ietf:params:scim:schemas:extension:workspace:2.0:User"
} as const;
export type UserSchema = typeof UserSchema[keyof typeof UserSchema];
export interface ValidationError {
    ctx?: Record<string, unknown>;
    input?: unknown;
    loc: (string | number)[];
    msg: string;
    type: string;
}
export interface VersionOut {
    version: string;
}
export const aiInsights = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/analytics/ai-insights", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const aiInsightsKey = ()=>{
    return [
        "/api/analytics/ai-insights"
    ] as const;
};
export function useAiInsights<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: aiInsightsKey(),
        queryFn: ()=>aiInsights(),
        ...options?.query
    });
}
export function useAiInsightsSuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: aiInsightsKey(),
        queryFn: ()=>aiInsights(),
        ...options?.query
    });
}
export const enrollmentForecast = async (options?: RequestInit): Promise<{
    data: EnrollmentForecastPoint[];
}> =>{
    const res = await fetch("/api/analytics/enrollment-forecast", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const enrollmentForecastKey = ()=>{
    return [
        "/api/analytics/enrollment-forecast"
    ] as const;
};
export function useEnrollmentForecast<TData = {
    data: EnrollmentForecastPoint[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: EnrollmentForecastPoint[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: enrollmentForecastKey(),
        queryFn: ()=>enrollmentForecast(),
        ...options?.query
    });
}
export function useEnrollmentForecastSuspense<TData = {
    data: EnrollmentForecastPoint[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: EnrollmentForecastPoint[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: enrollmentForecastKey(),
        queryFn: ()=>enrollmentForecast(),
        ...options?.query
    });
}
export const riskDrivers = async (options?: RequestInit): Promise<{
    data: RiskDriver[];
}> =>{
    const res = await fetch("/api/analytics/risk-drivers", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const riskDriversKey = ()=>{
    return [
        "/api/analytics/risk-drivers"
    ] as const;
};
export function useRiskDrivers<TData = {
    data: RiskDriver[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: RiskDriver[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: riskDriversKey(),
        queryFn: ()=>riskDrivers(),
        ...options?.query
    });
}
export function useRiskDriversSuspense<TData = {
    data: RiskDriver[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: RiskDriver[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: riskDriversKey(),
        queryFn: ()=>riskDrivers(),
        ...options?.query
    });
}
export const chat = async (data: ChatRequest, options?: RequestInit): Promise<{
    data: ChatResponse;
}> =>{
    const res = await fetch("/api/chat", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useChat(options?: {
    mutation?: UseMutationOptions<{
        data: ChatResponse;
    }, ApiError, ChatRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>chat(data),
        ...options?.mutation
    });
}
export interface ListCoursesParams {
    faculty?: string | null;
}
export const listCourses = async (params?: ListCoursesParams, options?: RequestInit): Promise<{
    data: CourseAnalytics[];
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.faculty != null) searchParams.set("faculty", String(params?.faculty));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/courses?${queryString}` : "/api/courses";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listCoursesKey = (params?: ListCoursesParams)=>{
    return [
        "/api/courses",
        params
    ] as const;
};
export function useListCourses<TData = {
    data: CourseAnalytics[];
}>(options?: {
    params?: ListCoursesParams;
    query?: Omit<UseQueryOptions<{
        data: CourseAnalytics[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listCoursesKey(options?.params),
        queryFn: ()=>listCourses(options?.params),
        ...options?.query
    });
}
export function useListCoursesSuspense<TData = {
    data: CourseAnalytics[];
}>(options?: {
    params?: ListCoursesParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: CourseAnalytics[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listCoursesKey(options?.params),
        queryFn: ()=>listCourses(options?.params),
        ...options?.query
    });
}
export interface CurrentUserParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const currentUser = async (params?: CurrentUserParams, options?: RequestInit): Promise<{
    data: User;
}> =>{
    const res = await fetch("/api/current-user", {
        ...options,
        method: "GET",
        headers: {
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        }
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const currentUserKey = (params?: CurrentUserParams)=>{
    return [
        "/api/current-user",
        params
    ] as const;
};
export function useCurrentUser<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export function useCurrentUserSuspense<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export const executiveMetrics = async (options?: RequestInit): Promise<{
    data: ExecutiveMetrics;
}> =>{
    const res = await fetch("/api/dashboard/executive", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const executiveMetricsKey = ()=>{
    return [
        "/api/dashboard/executive"
    ] as const;
};
export function useExecutiveMetrics<TData = {
    data: ExecutiveMetrics;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: ExecutiveMetrics;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: executiveMetricsKey(),
        queryFn: ()=>executiveMetrics(),
        ...options?.query
    });
}
export function useExecutiveMetricsSuspense<TData = {
    data: ExecutiveMetrics;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: ExecutiveMetrics;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: executiveMetricsKey(),
        queryFn: ()=>executiveMetrics(),
        ...options?.query
    });
}
export const riskDistribution = async (options?: RequestInit): Promise<{
    data: RiskDistribution[];
}> =>{
    const res = await fetch("/api/dashboard/risk-distribution", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const riskDistributionKey = ()=>{
    return [
        "/api/dashboard/risk-distribution"
    ] as const;
};
export function useRiskDistribution<TData = {
    data: RiskDistribution[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: RiskDistribution[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: riskDistributionKey(),
        queryFn: ()=>riskDistribution(),
        ...options?.query
    });
}
export function useRiskDistributionSuspense<TData = {
    data: RiskDistribution[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: RiskDistribution[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: riskDistributionKey(),
        queryFn: ()=>riskDistribution(),
        ...options?.query
    });
}
export const dashboardStats = async (options?: RequestInit): Promise<{
    data: DashboardStats;
}> =>{
    const res = await fetch("/api/dashboard/stats", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const dashboardStatsKey = ()=>{
    return [
        "/api/dashboard/stats"
    ] as const;
};
export function useDashboardStats<TData = {
    data: DashboardStats;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: DashboardStats;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: dashboardStatsKey(),
        queryFn: ()=>dashboardStats(),
        ...options?.query
    });
}
export function useDashboardStatsSuspense<TData = {
    data: DashboardStats;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: DashboardStats;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: dashboardStatsKey(),
        queryFn: ()=>dashboardStats(),
        ...options?.query
    });
}
export const effectivenessAiSummary = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/effectiveness/ai-summary", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const effectivenessAiSummaryKey = ()=>{
    return [
        "/api/effectiveness/ai-summary"
    ] as const;
};
export function useEffectivenessAiSummary<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: effectivenessAiSummaryKey(),
        queryFn: ()=>effectivenessAiSummary(),
        ...options?.query
    });
}
export function useEffectivenessAiSummarySuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: effectivenessAiSummaryKey(),
        queryFn: ()=>effectivenessAiSummary(),
        ...options?.query
    });
}
export const effectivenessByEquity = async (options?: RequestInit): Promise<{
    data: EffectivenessByEquity[];
}> =>{
    const res = await fetch("/api/effectiveness/by-equity", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const effectivenessByEquityKey = ()=>{
    return [
        "/api/effectiveness/by-equity"
    ] as const;
};
export function useEffectivenessByEquity<TData = {
    data: EffectivenessByEquity[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: EffectivenessByEquity[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: effectivenessByEquityKey(),
        queryFn: ()=>effectivenessByEquity(),
        ...options?.query
    });
}
export function useEffectivenessByEquitySuspense<TData = {
    data: EffectivenessByEquity[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: EffectivenessByEquity[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: effectivenessByEquityKey(),
        queryFn: ()=>effectivenessByEquity(),
        ...options?.query
    });
}
export const effectivenessByType = async (options?: RequestInit): Promise<{
    data: EffectivenessByType[];
}> =>{
    const res = await fetch("/api/effectiveness/by-type", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const effectivenessByTypeKey = ()=>{
    return [
        "/api/effectiveness/by-type"
    ] as const;
};
export function useEffectivenessByType<TData = {
    data: EffectivenessByType[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: EffectivenessByType[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: effectivenessByTypeKey(),
        queryFn: ()=>effectivenessByType(),
        ...options?.query
    });
}
export function useEffectivenessByTypeSuspense<TData = {
    data: EffectivenessByType[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: EffectivenessByType[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: effectivenessByTypeKey(),
        queryFn: ()=>effectivenessByType(),
        ...options?.query
    });
}
export const effectivenessComparison = async (options?: RequestInit): Promise<{
    data: EffectivenessMetrics;
}> =>{
    const res = await fetch("/api/effectiveness/comparison", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const effectivenessComparisonKey = ()=>{
    return [
        "/api/effectiveness/comparison"
    ] as const;
};
export function useEffectivenessComparison<TData = {
    data: EffectivenessMetrics;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: EffectivenessMetrics;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: effectivenessComparisonKey(),
        queryFn: ()=>effectivenessComparison(),
        ...options?.query
    });
}
export function useEffectivenessComparisonSuspense<TData = {
    data: EffectivenessMetrics;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: EffectivenessMetrics;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: effectivenessComparisonKey(),
        queryFn: ()=>effectivenessComparison(),
        ...options?.query
    });
}
export const listFaculty = async (options?: RequestInit): Promise<{
    data: FacultyPerformance[];
}> =>{
    const res = await fetch("/api/faculty", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listFacultyKey = ()=>{
    return [
        "/api/faculty"
    ] as const;
};
export function useListFaculty<TData = {
    data: FacultyPerformance[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: FacultyPerformance[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listFacultyKey(),
        queryFn: ()=>listFaculty(),
        ...options?.query
    });
}
export function useListFacultySuspense<TData = {
    data: FacultyPerformance[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: FacultyPerformance[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listFacultyKey(),
        queryFn: ()=>listFaculty(),
        ...options?.query
    });
}
export const listFacultyNames = async (options?: RequestInit): Promise<{
    data: string[];
}> =>{
    const res = await fetch("/api/faculty/names", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listFacultyNamesKey = ()=>{
    return [
        "/api/faculty/names"
    ] as const;
};
export function useListFacultyNames<TData = {
    data: string[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: string[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listFacultyNamesKey(),
        queryFn: ()=>listFacultyNames(),
        ...options?.query
    });
}
export function useListFacultyNamesSuspense<TData = {
    data: string[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: string[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listFacultyNamesKey(),
        queryFn: ()=>listFacultyNames(),
        ...options?.query
    });
}
export const generateInterventionPlan = async (data: InterventionRequest, options?: RequestInit): Promise<{
    data: InterventionPlan;
}> =>{
    const res = await fetch("/api/intervention/plan", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useGenerateInterventionPlan(options?: {
    mutation?: UseMutationOptions<{
        data: InterventionPlan;
    }, ApiError, InterventionRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>generateInterventionPlan(data),
        ...options?.mutation
    });
}
export const outcomeAiSummary = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/outcomes/ai-summary", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const outcomeAiSummaryKey = ()=>{
    return [
        "/api/outcomes/ai-summary"
    ] as const;
};
export function useOutcomeAiSummary<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: outcomeAiSummaryKey(),
        queryFn: ()=>outcomeAiSummary(),
        ...options?.query
    });
}
export function useOutcomeAiSummarySuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: outcomeAiSummaryKey(),
        queryFn: ()=>outcomeAiSummary(),
        ...options?.query
    });
}
export const outcomeByEquity = async (options?: RequestInit): Promise<{
    data: OutcomeByEquity[];
}> =>{
    const res = await fetch("/api/outcomes/by-equity", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const outcomeByEquityKey = ()=>{
    return [
        "/api/outcomes/by-equity"
    ] as const;
};
export function useOutcomeByEquity<TData = {
    data: OutcomeByEquity[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: OutcomeByEquity[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: outcomeByEquityKey(),
        queryFn: ()=>outcomeByEquity(),
        ...options?.query
    });
}
export function useOutcomeByEquitySuspense<TData = {
    data: OutcomeByEquity[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: OutcomeByEquity[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: outcomeByEquityKey(),
        queryFn: ()=>outcomeByEquity(),
        ...options?.query
    });
}
export const outcomeByFaculty = async (options?: RequestInit): Promise<{
    data: OutcomeByFaculty[];
}> =>{
    const res = await fetch("/api/outcomes/by-faculty", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const outcomeByFacultyKey = ()=>{
    return [
        "/api/outcomes/by-faculty"
    ] as const;
};
export function useOutcomeByFaculty<TData = {
    data: OutcomeByFaculty[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: OutcomeByFaculty[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: outcomeByFacultyKey(),
        queryFn: ()=>outcomeByFaculty(),
        ...options?.query
    });
}
export function useOutcomeByFacultySuspense<TData = {
    data: OutcomeByFaculty[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: OutcomeByFaculty[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: outcomeByFacultyKey(),
        queryFn: ()=>outcomeByFaculty(),
        ...options?.query
    });
}
export const outcomeStudents = async (options?: RequestInit): Promise<{
    data: OutcomeStudent[];
}> =>{
    const res = await fetch("/api/outcomes/students", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const outcomeStudentsKey = ()=>{
    return [
        "/api/outcomes/students"
    ] as const;
};
export function useOutcomeStudents<TData = {
    data: OutcomeStudent[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: OutcomeStudent[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: outcomeStudentsKey(),
        queryFn: ()=>outcomeStudents(),
        ...options?.query
    });
}
export function useOutcomeStudentsSuspense<TData = {
    data: OutcomeStudent[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: OutcomeStudent[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: outcomeStudentsKey(),
        queryFn: ()=>outcomeStudents(),
        ...options?.query
    });
}
export const outcomeSummary = async (options?: RequestInit): Promise<{
    data: OutcomeSummary;
}> =>{
    const res = await fetch("/api/outcomes/summary", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const outcomeSummaryKey = ()=>{
    return [
        "/api/outcomes/summary"
    ] as const;
};
export function useOutcomeSummary<TData = {
    data: OutcomeSummary;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: OutcomeSummary;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: outcomeSummaryKey(),
        queryFn: ()=>outcomeSummary(),
        ...options?.query
    });
}
export function useOutcomeSummarySuspense<TData = {
    data: OutcomeSummary;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: OutcomeSummary;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: outcomeSummaryKey(),
        queryFn: ()=>outcomeSummary(),
        ...options?.query
    });
}
export const outcomeTrend = async (options?: RequestInit): Promise<{
    data: OutcomeTrendPoint[];
}> =>{
    const res = await fetch("/api/outcomes/trend", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const outcomeTrendKey = ()=>{
    return [
        "/api/outcomes/trend"
    ] as const;
};
export function useOutcomeTrend<TData = {
    data: OutcomeTrendPoint[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: OutcomeTrendPoint[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: outcomeTrendKey(),
        queryFn: ()=>outcomeTrend(),
        ...options?.query
    });
}
export function useOutcomeTrendSuspense<TData = {
    data: OutcomeTrendPoint[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: OutcomeTrendPoint[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: outcomeTrendKey(),
        queryFn: ()=>outcomeTrend(),
        ...options?.query
    });
}
export interface ListOutreachParams {
    priority?: string | null;
    faculty?: string | null;
    limit?: number;
}
export const listOutreach = async (params?: ListOutreachParams, options?: RequestInit): Promise<{
    data: OutreachStudent[];
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.priority != null) searchParams.set("priority", String(params?.priority));
    if (params?.faculty != null) searchParams.set("faculty", String(params?.faculty));
    if (params?.limit != null) searchParams.set("limit", String(params?.limit));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/outreach?${queryString}` : "/api/outreach";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listOutreachKey = (params?: ListOutreachParams)=>{
    return [
        "/api/outreach",
        params
    ] as const;
};
export function useListOutreach<TData = {
    data: OutreachStudent[];
}>(options?: {
    params?: ListOutreachParams;
    query?: Omit<UseQueryOptions<{
        data: OutreachStudent[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listOutreachKey(options?.params),
        queryFn: ()=>listOutreach(options?.params),
        ...options?.query
    });
}
export function useListOutreachSuspense<TData = {
    data: OutreachStudent[];
}>(options?: {
    params?: ListOutreachParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: OutreachStudent[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listOutreachKey(options?.params),
        queryFn: ()=>listOutreach(options?.params),
        ...options?.query
    });
}
export const updateCase = async (data: CaseUpdateRequest, options?: RequestInit): Promise<{
    data: OutreachLogEntry;
}> =>{
    const res = await fetch("/api/outreach/case-update", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useUpdateCase(options?: {
    mutation?: UseMutationOptions<{
        data: OutreachLogEntry;
    }, ApiError, CaseUpdateRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>updateCase(data),
        ...options?.mutation
    });
}
export const composeOutreach = async (data: OutreachRequest, options?: RequestInit): Promise<{
    data: OutreachEmail;
}> =>{
    const res = await fetch("/api/outreach/compose", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useComposeOutreach(options?: {
    mutation?: UseMutationOptions<{
        data: OutreachEmail;
    }, ApiError, OutreachRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>composeOutreach(data),
        ...options?.mutation
    });
}
export const getOutreachLog = async (options?: RequestInit): Promise<{
    data: Record<string, OutreachLogEntry>;
}> =>{
    const res = await fetch("/api/outreach/log", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getOutreachLogKey = ()=>{
    return [
        "/api/outreach/log"
    ] as const;
};
export function useGetOutreachLog<TData = {
    data: Record<string, OutreachLogEntry>;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: Record<string, OutreachLogEntry>;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getOutreachLogKey(),
        queryFn: ()=>getOutreachLog(),
        ...options?.query
    });
}
export function useGetOutreachLogSuspense<TData = {
    data: Record<string, OutreachLogEntry>;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: Record<string, OutreachLogEntry>;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getOutreachLogKey(),
        queryFn: ()=>getOutreachLog(),
        ...options?.query
    });
}
export const logOutreach = async (data: OutreachLogRequest, options?: RequestInit): Promise<{
    data: OutreachLogEntry;
}> =>{
    const res = await fetch("/api/outreach/log", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useLogOutreach(options?: {
    mutation?: UseMutationOptions<{
        data: OutreachLogEntry;
    }, ApiError, OutreachLogRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>logOutreach(data),
        ...options?.mutation
    });
}
export const logPlanning = async (data: OutreachLogRequest, options?: RequestInit): Promise<{
    data: OutreachLogEntry;
}> =>{
    const res = await fetch("/api/outreach/planning", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useLogPlanning(options?: {
    mutation?: UseMutationOptions<{
        data: OutreachLogEntry;
    }, ApiError, OutreachLogRequest>;
}) {
    return useMutation({
        mutationFn: (data)=>logPlanning(data),
        ...options?.mutation
    });
}
export const listRetention = async (options?: RequestInit): Promise<{
    data: RetentionByFaculty[];
}> =>{
    const res = await fetch("/api/retention", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listRetentionKey = ()=>{
    return [
        "/api/retention"
    ] as const;
};
export function useListRetention<TData = {
    data: RetentionByFaculty[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: RetentionByFaculty[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listRetentionKey(),
        queryFn: ()=>listRetention(),
        ...options?.query
    });
}
export function useListRetentionSuspense<TData = {
    data: RetentionByFaculty[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: RetentionByFaculty[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listRetentionKey(),
        queryFn: ()=>listRetention(),
        ...options?.query
    });
}
export interface ListStudentsParams {
    search?: string | null;
    risk_level?: string | null;
    faculty?: string | null;
    status?: string | null;
    limit?: number;
    offset?: number;
}
export const listStudents = async (params?: ListStudentsParams, options?: RequestInit): Promise<{
    data: StudentSummary[];
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.search != null) searchParams.set("search", String(params?.search));
    if (params?.risk_level != null) searchParams.set("risk_level", String(params?.risk_level));
    if (params?.faculty != null) searchParams.set("faculty", String(params?.faculty));
    if (params?.status != null) searchParams.set("status", String(params?.status));
    if (params?.limit != null) searchParams.set("limit", String(params?.limit));
    if (params?.offset != null) searchParams.set("offset", String(params?.offset));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/students?${queryString}` : "/api/students";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const listStudentsKey = (params?: ListStudentsParams)=>{
    return [
        "/api/students",
        params
    ] as const;
};
export function useListStudents<TData = {
    data: StudentSummary[];
}>(options?: {
    params?: ListStudentsParams;
    query?: Omit<UseQueryOptions<{
        data: StudentSummary[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: listStudentsKey(options?.params),
        queryFn: ()=>listStudents(options?.params),
        ...options?.query
    });
}
export function useListStudentsSuspense<TData = {
    data: StudentSummary[];
}>(options?: {
    params?: ListStudentsParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: StudentSummary[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: listStudentsKey(options?.params),
        queryFn: ()=>listStudents(options?.params),
        ...options?.query
    });
}
export interface GetStudentParams {
    student_id: number;
}
export const getStudent = async (params: GetStudentParams, options?: RequestInit): Promise<{
    data: Student360Detail;
}> =>{
    const res = await fetch(`/api/students/${params.student_id}`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getStudentKey = (params?: GetStudentParams)=>{
    return [
        "/api/students/{student_id}",
        params
    ] as const;
};
export function useGetStudent<TData = {
    data: Student360Detail;
}>(options: {
    params: GetStudentParams;
    query?: Omit<UseQueryOptions<{
        data: Student360Detail;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getStudentKey(options.params),
        queryFn: ()=>getStudent(options.params),
        ...options?.query
    });
}
export function useGetStudentSuspense<TData = {
    data: Student360Detail;
}>(options: {
    params: GetStudentParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: Student360Detail;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getStudentKey(options.params),
        queryFn: ()=>getStudent(options.params),
        ...options?.query
    });
}
export interface GetStudentCohortParams {
    student_id: number;
}
export const getStudentCohort = async (params: GetStudentCohortParams, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch(`/api/students/${params.student_id}/cohort`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getStudentCohortKey = (params?: GetStudentCohortParams)=>{
    return [
        "/api/students/{student_id}/cohort",
        params
    ] as const;
};
export function useGetStudentCohort<TData = {
    data: unknown;
}>(options: {
    params: GetStudentCohortParams;
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getStudentCohortKey(options.params),
        queryFn: ()=>getStudentCohort(options.params),
        ...options?.query
    });
}
export function useGetStudentCohortSuspense<TData = {
    data: unknown;
}>(options: {
    params: GetStudentCohortParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getStudentCohortKey(options.params),
        queryFn: ()=>getStudentCohort(options.params),
        ...options?.query
    });
}
export interface GetStudentEnrollmentsParams {
    student_id: number;
}
export const getStudentEnrollments = async (params: GetStudentEnrollmentsParams, options?: RequestInit): Promise<{
    data: EnrollmentRecord[];
}> =>{
    const res = await fetch(`/api/students/${params.student_id}/enrollments`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getStudentEnrollmentsKey = (params?: GetStudentEnrollmentsParams)=>{
    return [
        "/api/students/{student_id}/enrollments",
        params
    ] as const;
};
export function useGetStudentEnrollments<TData = {
    data: EnrollmentRecord[];
}>(options: {
    params: GetStudentEnrollmentsParams;
    query?: Omit<UseQueryOptions<{
        data: EnrollmentRecord[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getStudentEnrollmentsKey(options.params),
        queryFn: ()=>getStudentEnrollments(options.params),
        ...options?.query
    });
}
export function useGetStudentEnrollmentsSuspense<TData = {
    data: EnrollmentRecord[];
}>(options: {
    params: GetStudentEnrollmentsParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: EnrollmentRecord[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getStudentEnrollmentsKey(options.params),
        queryFn: ()=>getStudentEnrollments(options.params),
        ...options?.query
    });
}
export interface GetStudentSupportParams {
    student_id: number;
}
export const getStudentSupport = async (params: GetStudentSupportParams, options?: RequestInit): Promise<{
    data: SupportInteraction[];
}> =>{
    const res = await fetch(`/api/students/${params.student_id}/support`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getStudentSupportKey = (params?: GetStudentSupportParams)=>{
    return [
        "/api/students/{student_id}/support",
        params
    ] as const;
};
export function useGetStudentSupport<TData = {
    data: SupportInteraction[];
}>(options: {
    params: GetStudentSupportParams;
    query?: Omit<UseQueryOptions<{
        data: SupportInteraction[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getStudentSupportKey(options.params),
        queryFn: ()=>getStudentSupport(options.params),
        ...options?.query
    });
}
export function useGetStudentSupportSuspense<TData = {
    data: SupportInteraction[];
}>(options: {
    params: GetStudentSupportParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: SupportInteraction[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getStudentSupportKey(options.params),
        queryFn: ()=>getStudentSupport(options.params),
        ...options?.query
    });
}
export const termTrends = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/trends", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const termTrendsKey = ()=>{
    return [
        "/api/trends"
    ] as const;
};
export function useTermTrends<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: termTrendsKey(),
        queryFn: ()=>termTrends(),
        ...options?.query
    });
}
export function useTermTrendsSuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: termTrendsKey(),
        queryFn: ()=>termTrends(),
        ...options?.query
    });
}
export const trendsForecast = async (options?: RequestInit): Promise<{
    data: ForecastPoint[];
}> =>{
    const res = await fetch("/api/trends/forecast", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const trendsForecastKey = ()=>{
    return [
        "/api/trends/forecast"
    ] as const;
};
export function useTrendsForecast<TData = {
    data: ForecastPoint[];
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: ForecastPoint[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: trendsForecastKey(),
        queryFn: ()=>trendsForecast(),
        ...options?.query
    });
}
export function useTrendsForecastSuspense<TData = {
    data: ForecastPoint[];
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: ForecastPoint[];
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: trendsForecastKey(),
        queryFn: ()=>trendsForecast(),
        ...options?.query
    });
}
export const version = async (options?: RequestInit): Promise<{
    data: VersionOut;
}> =>{
    const res = await fetch("/api/version", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const versionKey = ()=>{
    return [
        "/api/version"
    ] as const;
};
export function useVersion<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export function useVersionSuspense<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export const governanceOverview = async (sampleStudentId?: number, options?: RequestInit): Promise<{
    data: GovernanceOverview;
}> =>{
    const params = sampleStudentId ? `?sample_student_id=${sampleStudentId}` : "";
    const res = await fetch(`/api/governance${params}`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const governanceOverviewKey = (sampleStudentId?: number)=>{
    return [
        "/api/governance",
        sampleStudentId
    ] as const;
};
export function useGovernanceOverview<TData = {
    data: GovernanceOverview;
}>(sampleStudentId?: number, options?: {
    query?: Omit<UseQueryOptions<{
        data: GovernanceOverview;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: governanceOverviewKey(sampleStudentId),
        queryFn: ()=>governanceOverview(sampleStudentId),
        ...options?.query
    });
}
export function useGovernanceOverviewSuspense<TData = {
    data: GovernanceOverview;
}>(sampleStudentId?: number, options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: GovernanceOverview;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: governanceOverviewKey(sampleStudentId),
        queryFn: ()=>governanceOverview(sampleStudentId),
        ...options?.query
    });
}
export const governanceAdvisorView = async (faculty?: string, options?: RequestInit): Promise<{
    data: AdvisorView;
}> =>{
    const params = faculty ? `?faculty=${encodeURIComponent(faculty)}` : "";
    const res = await fetch(`/api/governance/advisor-view${params}`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try { parsed = JSON.parse(body); } catch { parsed = body; }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return { data: await res.json() };
};
export const governanceAdvisorViewKey = (faculty?: string)=>{
    return ["/api/governance/advisor-view", faculty] as const;
};
export function useGovernanceAdvisorView<TData = {
    data: AdvisorView;
}>(faculty?: string, options?: {
    query?: Omit<UseQueryOptions<{
        data: AdvisorView;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: governanceAdvisorViewKey(faculty),
        queryFn: ()=>governanceAdvisorView(faculty),
        ...options?.query
    });
}
