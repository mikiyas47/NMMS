import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Target, Star, Trophy, CheckCircle2, Circle } from 'lucide-react-native';

const GoalsScreen = ({ C }) => {
  const goals = [
    {
      id: 1,
      title: 'Reach Gold Rank',
      description: 'Get 15 direct referrals',
      current: 8,
      target: 15,
      reward: '$500 Bonus',
      icon: Star,
      color: C.amber,
    },
    {
      id: 2,
      title: 'Team Size: 50',
      description: 'Grow your team to 50 members',
      current: 42,
      target: 50,
      reward: '$1,000 Bonus',
      icon: Target,
      color: C.green,
    },
    {
      id: 3,
      title: 'Monthly Earnings: $3,000',
      description: 'Earn $3,000 in a single month',
      current: 2450,
      target: 3000,
      reward: 'Platinum Status',
      icon: Trophy,
      color: C.purple,
    },
  ];

  const achievements = [
    { id: 1, title: 'First Referral', date: 'Nov 15, 2024', completed: true },
    { id: 2, title: '5 Direct Referrals', date: 'Dec 1, 2024', completed: true },
    { id: 3, title: '10 Team Members', date: 'Dec 10, 2024', completed: true },
    { id: 4, title: 'Silver Rank', date: 'Dec 20, 2024', completed: true },
  ];

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="flex-row items-center mb-1">
        <Target color={C.amber} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>Goals & Achievements</Text>
      </View>
      <Text className="text-sm mb-5" style={{ color: C.muted }}>Track your progress and milestones</Text>

      {/* Active Goals */}
      <Text className="text-base font-bold mb-3" style={{ color: C.text }}>Active Goals</Text>
      {goals.map((goal) => {
        const progress = calculateProgress(goal.current, goal.target);
        return (
          <View
            key={goal.id}
            className="rounded-2xl p-5 mb-3"
            style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
          >
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${goal.color}20` }}>
                <goal.icon color={goal.color} size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: C.text }}>{goal.title}</Text>
                <Text className="text-xs" style={{ color: C.muted }}>{goal.description}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs" style={{ color: C.muted }}>Progress</Text>
                <Text className="text-xs font-bold" style={{ color: goal.color }}>{progress.toFixed(0)}%</Text>
              </View>
              <View className="h-2 rounded-full" style={{ backgroundColor: C.border }}>
                <View
                  className="h-2 rounded-full"
                  style={{ width: `${progress}%`, backgroundColor: goal.color }}
                />
              </View>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-xs" style={{ color: C.sub }}>
                {goal.current} / {goal.target}
              </Text>
              <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: `${goal.color}15` }}>
                <Text className="text-xs font-bold" style={{ color: goal.color }}>Reward: {goal.reward}</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Achievements */}
      <Text className="text-base font-bold mb-3 mt-5" style={{ color: C.text }}>Achievements Unlocked</Text>
      <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
        {achievements.map((achievement, i) => (
          <View
            key={achievement.id}
            className="flex-row items-center px-4 py-3"
            style={{ borderBottomWidth: i < achievements.length - 1 ? 1 : 0, borderBottomColor: C.border }}
          >
            {achievement.completed ? (
              <CheckCircle2 color={C.green} size={20} />
            ) : (
              <Circle color={C.muted} size={20} />
            )}
            <View className="flex-1 ml-3">
              <Text className="text-sm font-semibold" style={{ color: C.text }}>{achievement.title}</Text>
              <Text className="text-xs" style={{ color: C.muted }}>{achievement.date}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default GoalsScreen;
