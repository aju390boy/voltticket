import mongoose from 'mongoose';

export function buildDashboardPipeline(eventId: string) {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(eventId) } },
    {
      $lookup: {
        from: 'seats',
        let: { eventId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$eventId', '$$eventId'] } } },
          { $project: { status: 1, price: 1, tier: 1 } },
        ],
        as: 'seats',
      },
    },
    {
      $addFields: {
        lockedCount: {
          $reduce: {
            input: '$seats',
            initialValue: 0,
            in: { $add: ['$$value', { $cond: [{ $eq: ['$$this.status', 'locked'] }, 1, 0] }] },
          },
        },
        soldCount: {
          $reduce: {
            input: '$seats',
            initialValue: 0,
            in: { $add: ['$$value', { $cond: [{ $eq: ['$$this.status', 'sold'] }, 1, 0] }] },
          },
        },
        availableCount: {
          $reduce: {
            input: '$seats',
            initialValue: 0,
            in: { $add: ['$$value', { $cond: [{ $eq: ['$$this.status', 'available'] }, 1, 0] }] },
          },
        },
        totalRevenue: {
          $reduce: {
            input: '$seats',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                { $cond: [{ $eq: ['$$this.status', 'sold'] }, '$$this.price', 0] },
              ],
            },
          },
        },
        revenueByTier: {
          $arrayToObject: {
            $map: {
              input: ['GA', 'LOWER', 'UPPER', 'VIP', 'BACKSTAGE'],
              as: 'tier',
              in: {
                k: '$$tier',
                v: {
                  $reduce: {
                    input: '$seats',
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        {
                          $cond: [
                            { $and: [{ $eq: ['$$this.status', 'sold'] }, { $eq: ['$$this.tier', '$$tier'] }] },
                            '$$this.price',
                            0,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    { $project: { seats: 0 } },
  ];
}

export function buildRecentOrdersPipeline(eventId: string, minutes = 60) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return [
    {
      $match: {
        eventId: new mongoose.Types.ObjectId(eventId),
        status: 'confirmed',
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          minute: { $dateToString: { format: '%H:%M', date: '$createdAt' } },
        },
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { '_id.minute': 1 as const } },
    { $project: { _id: 0, time: '$_id.minute', count: 1, revenue: 1 } },
  ];
}
