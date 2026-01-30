import { List } from "@refinedev/antd";
import { Tabs } from "antd";
import { WikiArticleList } from "./Articles";
import { WikiCategories } from "./Categories";
import { WikiReviews } from "./Review";

export const WikiList = () => {
  const items = [
    {
      key: "categories",
      label: "分类管理",
      children: <WikiCategories />,
    },
    {
      key: "articles",
      label: "文章管理",
      children: <WikiArticleList />,
    },
    {
      key: "reviews",
      label: "修改审核",
      children: <WikiReviews />,
    },
  ];

  return (
    <List>
      <Tabs defaultActiveKey="categories" destroyOnHidden items={items} />
    </List>
  );
};
