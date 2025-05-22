
export default (sequelize) => {
  const userRole = sequelize.define('userRole', {}, {
    timestamps: false,
    tableName: 'user_roles' // Optional: expliziter Tabellenname
  });

  return userRole;
};