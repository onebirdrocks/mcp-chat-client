#!/bin/bash

# MCP Chat UI Deployment Script
# This script handles the deployment process for the MCP Chat UI application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mcp-chat-ui"
DOCKER_IMAGE="$APP_NAME:latest"
BACKUP_DIR="./backups"
DATA_DIR="./data"
CONFIG_DIR="./config"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Node.js is installed (for local development)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js is not installed. This is required for local development."
    fi
    
    log_success "Prerequisites check completed"
}

# Create backup of current data
create_backup() {
    log_info "Creating backup of current data..."
    
    if [ -d "$DATA_DIR" ]; then
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
        
        mkdir -p "$BACKUP_PATH"
        cp -r "$DATA_DIR" "$BACKUP_PATH/"
        cp -r "$CONFIG_DIR" "$BACKUP_PATH/" 2>/dev/null || true
        
        log_success "Backup created at $BACKUP_PATH"
    else
        log_warning "No data directory found, skipping backup"
    fi
}

# Build the application
build_app() {
    log_info "Building the application..."
    
    # Clean previous builds
    npm run clean
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Run tests
    log_info "Running tests..."
    npm run test:all
    
    # Build the application
    log_info "Building production bundle..."
    npm run build:production
    
    log_success "Application built successfully"
}

# Build Docker image
build_docker() {
    log_info "Building Docker image..."
    
    docker build -t "$DOCKER_IMAGE" .
    
    log_success "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_docker() {
    log_info "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose down
    
    # Start new containers
    docker-compose up -d
    
    # Wait for health check
    log_info "Waiting for application to be healthy..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Application is healthy and running"
    else
        log_error "Application health check failed"
        docker-compose logs
        exit 1
    fi
    
    log_success "Deployment completed successfully"
}

# Deploy to production server
deploy_production() {
    log_info "Deploying to production..."
    
    # Ensure environment is set to production
    export NODE_ENV=production
    
    # Create necessary directories
    mkdir -p "$DATA_DIR/sessions" "$DATA_DIR/settings" "$CONFIG_DIR"
    
    # Set proper permissions
    chmod 755 "$DATA_DIR" "$CONFIG_DIR"
    chmod 644 "$CONFIG_DIR"/*.json 2>/dev/null || true
    
    # Build and deploy
    build_app
    build_docker
    deploy_docker
    
    log_success "Production deployment completed"
}

# Local development setup
setup_development() {
    log_info "Setting up development environment..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env.local" ]; then
        cp ".env.example" ".env.local"
        log_warning "Please edit .env.local with your configuration"
    fi
    
    # Create data directories
    mkdir -p "$DATA_DIR/sessions" "$DATA_DIR/settings" "$CONFIG_DIR"
    
    # Install dependencies
    npm install
    
    # Run initial setup
    npm run type-check
    
    log_success "Development environment setup completed"
    log_info "Run 'npm run dev' to start the development server"
}

# Rollback to previous version
rollback() {
    log_info "Rolling back to previous version..."
    
    # Stop current containers
    docker-compose down
    
    # Restore from latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log_info "Restoring from backup: $LATEST_BACKUP"
        cp -r "$BACKUP_DIR/$LATEST_BACKUP/data" ./
        cp -r "$BACKUP_DIR/$LATEST_BACKUP/config" ./ 2>/dev/null || true
        
        # Start containers with previous configuration
        docker-compose up -d
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

# Clean up old backups
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Keep only the last 10 backups
        ls -t "$BACKUP_DIR" | tail -n +11 | xargs -I {} rm -rf "$BACKUP_DIR/{}"
        log_success "Old backups cleaned up"
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Set up development environment"
    echo "  build       Build the application"
    echo "  deploy      Deploy to production"
    echo "  docker      Build and deploy with Docker"
    echo "  backup      Create backup of current data"
    echo "  rollback    Rollback to previous version"
    echo "  cleanup     Clean up old backups"
    echo "  health      Check application health"
    echo "  logs        Show application logs"
    echo "  stop        Stop the application"
    echo "  restart     Restart the application"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Set up development environment"
    echo "  $0 deploy   # Deploy to production"
    echo "  $0 backup   # Create backup before deployment"
}

# Check application health
check_health() {
    log_info "Checking application health..."
    
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Application is healthy"
    else
        log_error "Application is not responding"
        exit 1
    fi
}

# Show application logs
show_logs() {
    docker-compose logs -f
}

# Stop the application
stop_app() {
    log_info "Stopping application..."
    docker-compose down
    log_success "Application stopped"
}

# Restart the application
restart_app() {
    log_info "Restarting application..."
    docker-compose restart
    log_success "Application restarted"
}

# Main script logic
main() {
    case "${1:-}" in
        "dev")
            check_prerequisites
            setup_development
            ;;
        "build")
            check_prerequisites
            build_app
            ;;
        "deploy")
            check_prerequisites
            create_backup
            deploy_production
            cleanup_backups
            ;;
        "docker")
            check_prerequisites
            build_docker
            deploy_docker
            ;;
        "backup")
            create_backup
            ;;
        "rollback")
            rollback
            ;;
        "cleanup")
            cleanup_backups
            ;;
        "health")
            check_health
            ;;
        "logs")
            show_logs
            ;;
        "stop")
            stop_app
            ;;
        "restart")
            restart_app
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: ${1:-}"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"