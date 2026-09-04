export function GET() {
  return Response.json({
    status: "healthy",
    service: "teacher-grants-dashboard",
    timestamp: new Date().toISOString(),
  })
}
