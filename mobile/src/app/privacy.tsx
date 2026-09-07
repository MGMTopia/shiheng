import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';

const sections = [
  { title: '食品数据从哪来', body: '澳洲主库来自 FSANZ AUSNUT 2023 与 AFCD Release 3，按官方 Data User Licence 随包使用，并附数据局限性声明。海外对照来自 USDA FoodData Central Foundation Foods（CC0），只作比较，不替代澳洲值。中餐家常菜仍是配方估算。超市包装摘录来自 Open Food Facts，不是 Woolworths 或 Coles 官方商品库。购买仍以包装标签为准。' },
  { title: '当前不做什么', body: '不会读取通讯录、定位、相册或健康平台数据；不会把饮食记录、反馈或本地指标上传到服务器，也不会用它建立广告画像。' },
  { title: '安卓程序更新', body: '正式安卓包装有自动更新：启动和回到前台时会向更新服务查询是否有新的程序包。该请求只用于程序版本，不含饮食记录。Expo Go 和网页不会走这条更新通道。' },
  { title: '你可以怎么控制', body: '可以导出 JSON 备份和 CSV 日志，并从备份恢复。也可以在“我的”页清除饮食记录或全部本机数据。卸载应用会删除沙箱内的记录、自定义食品、图鉴核对、反馈和指标。已关闭 Google 云备份和换机传送，避免卸载后再安装时被系统还原。未来如需云同步或接入第三方服务，会在启用前重新说明并征求同意。' },
  { title: '健康使用边界', body: '目标和建议仅用于一般健康记录，不针对疾病、药物、孕期、过敏或化验结果提供诊断和治疗建议。特殊情况请咨询澳洲注册营养师（APD）或医生。' },
] as const;

export default function PrivacyScreen() {
  return <Screen>
    <View style={styles.header}><Text style={styles.title}>隐私与数据说明</Text><Text style={styles.subtitle}>透明、可理解、由你控制。</Text></View>
    <Card style={styles.notice}><Text style={styles.noticeTitle}>本机优先</Text><Text style={styles.noticeBody}>当前版本没有账号和云端同步。你的记录留在这台设备上。</Text></Card>
    {sections.map((section) => <View key={section.title} style={styles.section}><SectionTitle>{section.title}</SectionTitle><Text style={styles.body}>{section.body}</Text></View>)}
    <TextButton label="返回上一页" onPress={() => router.back()} />
  </Screen>;
}

const styles = StyleSheet.create({
  header: { gap: 5 }, title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13 },
  notice: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' }, noticeTitle: { color: colors.brandDark, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm }, noticeBody: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  section: { gap: spacing.sm }, body: { color: colors.inkMuted, fontSize: 13, lineHeight: 22 },
});
