/**
 * This class can be used for analysing codebase performance.
 * It allows for creation of individual timers and measuring their status over time.
 * Finally, it enables to export data in various formats which can be easily used in graphing tools
 * to visually represent the measured data in a form of line plots etc.
 */
export class PerformanceMeasurer {
    private static _timerRecords: Map<string, number[]> = new Map<string, number[]>();
    private static _timerStartTimes: Map<string, number> = new Map<string, number>();

    public static startMeasure(timerName: string) {
        if (this._timerStartTimes.has(timerName)) {
            console.error("Timer " + timerName + " is already started!");
            return;
        }

        this._timerStartTimes.set(timerName, performance.now());
    }

    public static endMeasure(timerName: string): void | number {
        if (!this._timerStartTimes.has(timerName)) {
            console.error("Timer " + timerName + " does not exist!");
            return;
        }

        const measuredTime = performance.now() - this._timerStartTimes.get(timerName)!;
        this._timerStartTimes.delete(timerName);

        if (!this._timerRecords.has(timerName)) {
            this._timerRecords.set(timerName, [measuredTime]);
        } else {
            this._timerRecords.get(timerName)!.push(measuredTime);
        }

        return measuredTime;
    }

    public static clearData() {
        this._timerRecords.clear();
        this._timerStartTimes.clear();
    }

    // If the timer names is left empty, all timers are exported
    public static exportDataAsCSV(...timerNames: string[]): string[] {
        let result: string[] = [];

        this._timerRecords.forEach((values: number[], key: string) => {
            if (timerNames.length === 0 || timerNames.indexOf(key) >= 0) {
                result.push(
                    values.map((val: number, index: number) => {
                        return index + ";" + val.toFixed(8);
                    }).join("\r\n"));
            }
        });

        return result;
    }

    public static printData(...timerNames: string[]): void {
        this._timerRecords.forEach((values: number[], key: string) => {
            if (timerNames.length === 0 || timerNames.indexOf(key) >= 0) {
                const s = values.length === 1 ? "" : "s";
                console.log((key + ": " + values.length + " measurement" + s + " recorded:\n")
                    + "-- " + values.join(" ms\n-- ") + " ms");
            }
        });
    }

    public static printAggrData(aggrType: "sum" | "avg", ...timerNames: string[]): void {
        this._timerRecords.forEach((values: number[], key: string) => {
            if (timerNames.length === 0 || timerNames.indexOf(key) !== -1) {
                const sum = values.reduce((a, b) => a + b, 0);
                if (aggrType === "sum") {
                    console.log(key + ": " + sum + " ms in total.");
                } else if (aggrType == "avg") {
                    console.log(key + ": " + sum / values.length + " ms in average");
                }
            }
        });
    }

    public static printAndClearData(...timerNames: string[]): void {
        this.printData(...timerNames);
        this.clearData();
    }

    // This object can be used with Chart.js library
    // or visualized directly as graph with https://quickchart.io/chart?c=<chart data>
    // ---
    // If the timer names is left empty, all timers are exported
    public static exportDataAsChartJsObject(...timerNames: string[]): any {
        let labels: number[] = [];
        let datasets: any[] = [];

        this._timerRecords.forEach((values: number[], key: string) => {
            if (timerNames.length === 0 || timerNames.indexOf(key) >= 0) {
                if (labels.length === 0) {
                    labels = Array.from(Array(values.length).keys());
                } else {
                    if (labels.length !== values.length) {
                        console.warn("Timer records are not of equal length: ", key);
                    }
                }

                datasets.push({
                    label: "Timer " + key,
                    fill: false,
                    borderColor: "rgb(" + Math.random() * 255 + "," + Math.random() * 255 + "," + Math.random() * 255 + ")",
                    data: values
                });
            }
        });

        return {
            type: "line",
            options: {
                title: {
                    display: true,
                    text: "Performance Measurer Chart (time in ms)"
                }
            },
            data: {
                labels: labels,
                datasets: datasets
            }
        }
    }
}