/**
 * SheetDash - Visualizations Module (INR)
 * Handles initialization, theme configurations, and reactive updates for Chart.js instances.
 */

// Global charts controller
window.dashboardCharts = {
    doughnutInstance: null,
    barInstance: null,

    /**
     * Get colors based on the current theme
     */
    getColors() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        return chartPalettes[theme];
    },

    /**
     * Render or update all chart visualizations
     */
    render(labels, data, totalCost) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library is not loaded!');
            return;
        }
        
        const colors = this.getColors();
        
        // Render Doughnut Chart
        this.renderDoughnut(labels, data, totalCost, colors);
        
        // Render Bar Chart
        this.renderBar(labels, data, colors);
    },

    /**
     * Doughnut chart initialization/updating
     */
    renderDoughnut(labels, data, totalCost, colors) {
        const ctx = document.getElementById('doughnut-chart').getContext('2d');
        
        if (this.doughnutInstance) {
            // Update existing instance
            this.doughnutInstance.data.labels = labels;
            this.doughnutInstance.data.datasets[0].data = data;
            this.doughnutInstance.data.datasets[0].backgroundColor = colors.backgrounds;
            this.doughnutInstance.data.datasets[0].borderColor = colors.borders;
            this.doughnutInstance.options.plugins.centerText.total = totalCost;
            this.doughnutInstance.update();
        } else {
            // Create new instance
            this.doughnutInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.backgrounds,
                        borderColor: colors.borders,
                        borderWidth: 1.5,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: colors.tickColor,
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 11,
                                    weight: '600'
                                },
                                padding: 16,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleFont: { family: "'Outfit', sans-serif", size: 13 },
                            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            padding: 12,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw || 0;
                                    const percentage = totalCost > 0 ? ((value / totalCost) * 100).toFixed(1) : 0;
                                    return ` Cost: ₹${value.toFixed(3)} (${percentage}%)`;
                                }
                            }
                        },
                        centerText: {
                            total: totalCost
                        }
                    }
                }
            });
        }
    },

    /**
     * Bar chart initialization/updating
     */
    renderBar(labels, data, colors) {
        const ctx = document.getElementById('bar-chart').getContext('2d');
        
        if (this.barInstance) {
            // Update existing instance
            this.barInstance.data.labels = labels;
            this.barInstance.data.datasets[0].data = data;
            this.barInstance.data.datasets[0].backgroundColor = colors.backgrounds;
            this.barInstance.data.datasets[0].borderColor = colors.borders;
            
            // Update axis styles
            this.barInstance.options.scales.x.grid.color = colors.gridColor;
            this.barInstance.options.scales.x.ticks.color = colors.tickColor;
            this.barInstance.options.scales.y.grid.color = colors.gridColor;
            this.barInstance.options.scales.y.ticks.color = colors.tickColor;
            
            this.barInstance.update();
        } else {
            // Create new instance
            this.barInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Cost Value',
                        data: data,
                        backgroundColor: colors.backgrounds,
                        borderColor: colors.borders,
                        borderWidth: 1.5,
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleFont: { family: "'Outfit', sans-serif", size: 13 },
                            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            padding: 12,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw || 0;
                                    return ` Cost: ₹${value.toFixed(3)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: colors.gridColor,
                                drawBorder: false
                            },
                            ticks: {
                                color: colors.tickColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: colors.gridColor,
                                drawBorder: false
                            },
                            ticks: {
                                color: colors.tickColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' }
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Updates colors and triggers redraws across all active charts
     */
    updateThemes(newTheme) {
        if (typeof Chart === 'undefined') return;
        const colors = chartPalettes[newTheme];
        
        if (this.doughnutInstance) {
            this.doughnutInstance.data.datasets[0].backgroundColor = colors.backgrounds;
            this.doughnutInstance.data.datasets[0].borderColor = colors.borders;
            this.doughnutInstance.options.plugins.legend.labels.color = colors.tickColor;
            this.doughnutInstance.update();
        }
        
        if (this.barInstance) {
            this.barInstance.data.datasets[0].backgroundColor = colors.backgrounds;
            this.barInstance.data.datasets[0].borderColor = colors.borders;
            this.barInstance.options.scales.x.grid.color = colors.gridColor;
            this.barInstance.options.scales.x.ticks.color = colors.tickColor;
            this.barInstance.options.scales.y.grid.color = colors.gridColor;
            this.barInstance.options.scales.y.ticks.color = colors.tickColor;
            this.barInstance.update();
        }
    }
};

// Color palettes for the charts
const chartPalettes = {
    dark: {
        backgrounds: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(244, 63, 94, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(236, 72, 153, 0.7)',
        ],
        borders: [
            '#6366f1',
            '#8b5cf6',
            '#10b981',
            '#f59e0b',
            '#f43f5e',
            '#0ea5e9',
            '#ec4899',
        ],
        gridColor: 'rgba(255, 255, 255, 0.05)',
        tickColor: '#94a3b8',
    },
    light: {
        backgrounds: [
            'rgba(99, 102, 241, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(244, 63, 94, 0.85)',
            'rgba(14, 165, 233, 0.85)',
            'rgba(236, 72, 153, 0.85)',
        ],
        borders: [
            '#4f46e5',
            '#7c3aed',
            '#059669',
            '#d97706',
            '#e11d48',
            '#0284c7',
            '#db2777',
        ],
        gridColor: 'rgba(0, 0, 0, 0.05)',
        tickColor: '#475569',
    }
};

// Register custom center plugin safely
if (typeof Chart !== 'undefined') {
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function(chart) {
            if (chart.config.type !== 'doughnut') return;
            
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            
            ctx.save();
            
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#f8fafc' : '#0f172a';
            const labelColor = isDark ? '#94a3b8' : '#64748b';
            
            const total = chart.config.options.plugins.centerText?.total || 0;
            
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            
            ctx.font = "700 10px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = labelColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.letterSpacing = '1px';
            ctx.fillText("TOTAL COST", centerX, centerY - 12);
            
            ctx.font = "800 24px 'Outfit', sans-serif";
            ctx.fillStyle = textColor;
            ctx.fillText(`₹${total.toFixed(3)}`, centerX, centerY + 12);
            
            ctx.restore();
        }
    };
    
    Chart.register(centerTextPlugin);
}
