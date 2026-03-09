import { DATA as POE_DATA } from "../../../data/poe/index.js";
import type { Stat } from "../../../data/poe/types.js";
import { getTextSkeleton, LINE_SEPARATOR } from "../util/text.js";

export interface MultilineStatGroup {
    maxLineSize: number;
    stats: MultilineStat[];
}

export interface MultilineStat {
    lineSize: number;
    stat: Stat;
}

export class StatProvider {
    private readonly zhSkeletonIdx = new Map<string, Stat[]>();
    private readonly firstLineZhSkeletonIdx = new Map<
        string,
        MultilineStatGroup
    >();
    private readonly referenceStats = new Array<Stat>();
    private readonly multilineRefStats = new Array<MultilineStat>();

    constructor() {
        for (const stat of POE_DATA.stats) {
            if (stat.refs) {
                this.referenceStats.push(stat);
                if (stat.zh.includes(LINE_SEPARATOR)) {
                    this.multilineRefStats.push({
                        lineSize: stat.zh.split(LINE_SEPARATOR).length,
                        stat: stat,
                    });
                }
                continue;
            }

            const zh = stat.zh;
            const skeleton = getTextSkeleton(zh);
            const idxValue = this.zhSkeletonIdx.get(skeleton);
            if (idxValue) {
                idxValue.push(stat);
            } else {
                this.zhSkeletonIdx.set(skeleton, [stat]);
            }

            if (zh.includes(LINE_SEPARATOR)) {
                const lines = zh.split(LINE_SEPARATOR);
                const firstLine = lines[0];
                const firstLineSkeleton = getTextSkeleton(firstLine);

                const idxValue =
                    this.firstLineZhSkeletonIdx.get(firstLineSkeleton);
                const multilineStat = { lineSize: lines.length, stat: stat };
                if (idxValue === undefined) {
                    this.firstLineZhSkeletonIdx.set(firstLineSkeleton, {
                        maxLineSize: lines.length,
                        stats: [multilineStat],
                    });
                } else {
                    if (idxValue.maxLineSize < lines.length) {
                        idxValue.maxLineSize = lines.length;
                    }
                    idxValue.stats.push(multilineStat);
                }
            }
        }

        // 按照行数从多到少排序，这样匹配时首先匹配更多的行
        for (const value of this.firstLineZhSkeletonIdx.values()) {
            if (value.stats.length > 1) {
                value.stats.sort((a, b) => b.lineSize - a.lineSize);
            }
        }
    }

    provideByZhSkeleton(skeleton: string): Stat[] | undefined {
        return this.zhSkeletonIdx.get(skeleton);
    }

    provideByFirstLineZhSkeleton(
        skeleton: string,
    ): MultilineStatGroup | undefined {
        return this.firstLineZhSkeletonIdx.get(skeleton);
    }

    provideReferenceStats(): Stat[] {
        return this.referenceStats;
    }

    provideMultilineReferenceStats(): MultilineStat[] {
        return this.multilineRefStats;
    }
}
