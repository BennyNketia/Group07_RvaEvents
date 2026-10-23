export const listOfUsers = JSON.parse(localStorage.getItem("listOfUsers")) || [];

export function userList(userInfo) {
    listOfUsers.push(userInfo);
    localStorage.setItem("listOfUsers", JSON.stringify(listOfUsers));
}