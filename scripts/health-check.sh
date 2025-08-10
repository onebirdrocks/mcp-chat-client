#!/bin/bash

# Health Check Script for MCP Chat UI
# This script performs comprehensive health checks on the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:3000"
TIMEOUT=10
MAX_RETRIES=3

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if application is responding
check_app_health() {
    log_info "Checking application health..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time $TIMEOUT "$APP_URL/api/health" > /dev/null; then
            log_success "Application is responding"
            return 0
        else
            retries=$((retries + 1))
            log_warning "Health check failed, retry $retries/$MAX_RETRIES"
            sleep 2
        fi
    done
    
    log_error "Application is not responding after $MAX_RETRIES attempts"
    return 1
}

# Check API endpoints
check_api_endpoints() {
    log_info "Checking API endpoints..."
    
    local endpoints=(
        "/api/health"
        "/api/settings"
        "/api/sessions"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time $TIMEOUT "$APP_URL$endpoint" > /dev/null; then
            log_success "Endpoint $endpoint is accessible"
        else
            log_error "Endpoint $endpoint is not accessible"
            return 1
        fi
    done
}

# Check Docker containers
check_docker_containers() {
    log_info "Checking Docker containers..."
    
    if command -v docker &> /dev/null; then
        local containers=$(docker-compose ps -q)
        if [ -n "$containers" ]; then
            for container in $containers; do
                local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
                local name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/\///')
                
                case $status in
                    "healthy")
                        log_success "Container $name is healthy"
                        ;;
                    "unhealthy")
                        log_error "Container $name is unhealthy"
                        return 1
                        ;;
                    "starting")
                        log_warning "Container $name is starting"
                        ;;
                    *)
                        log_warning "Container $name status: $status"
                        ;;
                esac
            done
        else
            log_warning "No Docker containers found"
        fi
    else
        log_warning "Docker not available, skipping container checks"
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_error "Disk usage is high: ${disk_usage}%"
        return 1
    elif [ "$disk_usage" -gt 80 ]; then
        log_warning "Disk usage is moderate: ${disk_usage}%"
    else
        log_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage (if available)
    if command -v free &> /dev/null; then
        local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$mem_usage" -gt 90 ]; then
            log_error "Memory usage is high: ${mem_usage}%"
            return 1
        elif [ "$mem_usage" -gt 80 ]; then
            log_warning "Memory usage is moderate: ${mem_usage}%"
        else
            log_success "Memory usage is normal: ${mem_usage}%"
        fi
    fi
}

# Check data directories
check_data_directories() {
    log_info "Checking data directories..."
    
    local directories=(
        "./data"
        "./data/sessions"
        "./data/settings"
        "./config"
    )
    
    for dir in "${directories[@]}"; do
        if [ -d "$dir" ]; then
            if [ -r "$dir" ] && [ -w "$dir" ]; then
                log_success "Directory $dir is accessible"
            else
                log_error "Directory $dir has permission issues"
                return 1
            fi
        else
            log_warning "Directory $dir does not exist"
        fi
    done
}

# Check configuration files
check_configuration() {
    log_info "Checking configuration files..."
    
    # Check MCP configuration
    if [ -f "./config/mcp.config.json" ]; then
        if jq empty "./config/mcp.config.json" 2>/dev/null; then
            log_success "MCP configuration is valid JSON"
        else
            log_error "MCP configuration is invalid JSON"
            return 1
        fi
    else
        log_warning "MCP configuration file not found"
    fi
    
    # Check environment file
    if [ -f ".env.local" ]; then
        log_success "Environment file found"
    else
        log_warning "Environment file not found"
    fi
}

# Check network connectivity
check_network() {
    log_info "Checking network connectivity..."
    
    # Check if we can reach external APIs (optional)
    local apis=(
        "https://api.openai.com"
        "https://api.deepseek.com"
        "https://openrouter.ai"
    )
    
    for api in "${apis[@]}"; do
        if curl -f -s --max-time 5 "$api" > /dev/null 2>&1; then
            log_success "Can reach $api"
        else
            log_warning "Cannot reach $api (this may be normal if API keys are not configured)"
        fi
    done
}

# Generate health report
generate_report() {
    log_info "Generating health report..."
    
    local report_file="health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "MCP Chat UI Health Report"
        echo "Generated: $(date)"
        echo "========================"
        echo ""
        
        echo "System Information:"
        echo "- OS: $(uname -s)"
        echo "- Architecture: $(uname -m)"
        echo "- Node.js: $(node --version 2>/dev/null || echo 'Not available')"
        echo "- Docker: $(docker --version 2>/dev/null || echo 'Not available')"
        echo ""
        
        echo "Application Status:"
        if curl -f -s --max-time $TIMEOUT "$APP_URL/api/health" > /dev/null; then
            echo "- Application: Healthy"
        else
            echo "- Application: Unhealthy"
        fi
        echo ""
        
        echo "Resource Usage:"
        echo "- Disk: $(df -h . | awk 'NR==2 {print $5}')"
        if command -v free &> /dev/null; then
            echo "- Memory: $(free | awk 'NR==2{printf "%.0f%%", $3*100/$2}')"
        fi
        echo ""
        
        echo "Configuration:"
        echo "- MCP Config: $([ -f './config/mcp.config.json' ] && echo 'Present' || echo 'Missing')"
        echo "- Environment: $([ -f '.env.local' ] && echo 'Present' || echo 'Missing')"
        echo ""
        
    } > "$report_file"
    
    log_success "Health report saved to $report_file"
}

# Main health check function
run_health_check() {
    log_info "Starting comprehensive health check..."
    
    local failed_checks=0
    
    # Run all checks
    check_app_health || failed_checks=$((failed_checks + 1))
    check_api_endpoints || failed_checks=$((failed_checks + 1))
    check_docker_containers || failed_checks=$((failed_checks + 1))
    check_system_resources || failed_checks=$((failed_checks + 1))
    check_data_directories || failed_checks=$((failed_checks + 1))
    check_configuration || failed_checks=$((failed_checks + 1))
    check_network || failed_checks=$((failed_checks + 1))
    
    # Generate report
    generate_report
    
    # Summary
    if [ $failed_checks -eq 0 ]; then
        log_success "All health checks passed!"
        return 0
    else
        log_error "$failed_checks health check(s) failed"
        return 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  check       Run comprehensive health check (default)"
    echo "  app         Check application health only"
    echo "  api         Check API endpoints only"
    echo "  docker      Check Docker containers only"
    echo "  system      Check system resources only"
    echo "  config      Check configuration files only"
    echo "  network     Check network connectivity only"
    echo "  report      Generate health report only"
    echo ""
}

# Main script logic
main() {
    case "${1:-check}" in
        "check")
            run_health_check
            ;;
        "app")
            check_app_health
            ;;
        "api")
            check_api_endpoints
            ;;
        "docker")
            check_docker_containers
            ;;
        "system")
            check_system_resources
            ;;
        "config")
            check_configuration
            ;;
        "network")
            check_network
            ;;
        "report")
            generate_report
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"